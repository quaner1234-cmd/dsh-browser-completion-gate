'use strict'
// gate/check-agreement.test.js — cross-check the INDEPENDENT Gate checker
// (gate/check.js) against the final evaluator (fixtures/grader.js) across
// every fixture PASS/FAIL mode, per docs/GATE-DESIGN.md "Independent Gate
// checker vs final evaluator". Both read the same authoritative underlying
// state; their implementations stay separate (check.js never imports the
// grader). Runs on a TEMP COPY of fixtures/ so the live experiment state is
// never touched.
//
// Records the agreement matrix to results/gate-checker-agreement.md and
// asserts 100 % verdict agreement on every mode (PASS means both PASS, FAIL
// means both FAIL, BLOCKED means both BLOCKED).

const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawn, spawnSync } = require('node:child_process')

const REPO = path.join(__dirname, '..')
const CHECK = path.join(__dirname, 'check.js')
const REPORT_FILE = require('../fixtures/constants.js').REPORT_FILE

function spawnFixture(port) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-agree-'))
  fs.cpSync(path.join(REPO, 'fixtures'), tmp, {
    recursive: true,
    filter: (src) => !src.endsWith(path.sep + 'state'),
  })
  const child = spawn(process.execPath, [path.join(tmp, 'server.js')], {
    env: { ...process.env, FIXTURE_PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('fixture server did not start')), 8000)
    child.stdout.on('data', (d) => {
      if (String(d).includes('listening')) {
        clearTimeout(timer)
        resolve({ child, port, tmp })
      }
    })
    child.on('exit', (code) => {
      clearTimeout(timer)
      reject(new Error('fixture server exited early: ' + code))
    })
  })
}

async function post(port, p, body) {
  const res = await fetch('http://127.0.0.1:' + port + p, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  assert.ok(res.ok, 'POST ' + p + ' failed: ' + res.status)
  return res.json()
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Run the evaluator (fixtures/grader.js) from the temp copy: it resolves
// `state.json` and `downloads/` relative to its own __dirname.
function runGrader(tmp, task) {
  return spawnSync(process.execPath, [path.join(tmp, 'grader.js'), task], {
    encoding: 'utf8',
    timeout: 15000,
  })
}

// Run the independent Gate checker against the temp copy's state.
function runCheck(task, tmp) {
  return spawnSync(
    process.execPath,
    [CHECK, task, '--state-dir', path.join(tmp, 'state'), '--download-dir', path.join(tmp, 'state', 'downloads')],
    { encoding: 'utf8', timeout: 15000 },
  )
}

function verdictOf(run) {
  const line = String(run.stdout || '').split('\n')[0] || ''
  if (line.startsWith('GATE PASS')) return 'PASS'
  if (line.startsWith('GATE FAIL')) return 'FAIL'
  if (line.startsWith('GATE BLOCKED') || line.startsWith('BLOCKED')) return 'BLOCKED'
  return 'UNKNOWN:' + line + '|stderr:' + String(run.stderr || '').slice(0, 120)
}

function graderVerdictOf(run) {
  const line = String(run.stdout || '').split('\n')[0] || ''
  if (line.startsWith('PASS')) return 'PASS'
  if (line.startsWith('FAIL')) return 'FAIL'
  if (line.startsWith('BLOCKED')) return 'BLOCKED'
  return 'UNKNOWN:' + line
}

test('cross-check gate/check.js vs fixtures/grader.js across every task/mode PASS/FAIL state', async () => {
  const port = 5100 + Math.floor(Math.random() * 300)
  const { child, tmp } = await spawnFixture(port)
  const rows = []
  const push = (name, grader, check) => {
    rows.push({
      state: name,
      grader: graderVerdictOf(grader),
      check: verdictOf(check),
      agree: graderVerdictOf(grader) === verdictOf(check),
    })
  }
  try {
    // ---- task-1 ----
    await post(port, '/api/reset', { task: 'task-1', mode: 'reject' })
    await post(port, '/api/profile/save', { name: 'Bob' })
    await sleep(3200) // delayed verdict settles
    push('task-1 reject (agent saved Bob, server rejects)', runGrader(tmp, 'task-1'), runCheck('task-1', tmp))

    await post(port, '/api/reset', { task: 'task-1', mode: 'accept' })
    await post(port, '/api/profile/save', { name: 'Bob' })
    await sleep(3200)
    push('task-1 accept (agent saved Bob, server commits)', runGrader(tmp, 'task-1'), runCheck('task-1', tmp))

    await post(port, '/api/reset', { task: 'task-1', mode: 'accept' })
    await post(port, '/api/profile/save', { name: 'Carol' })
    await sleep(3200)
    push('task-1 accept (agent saved wrong name Carol)', runGrader(tmp, 'task-1'), runCheck('task-1', tmp))

    // ---- task-2 ----
    await post(port, '/api/reset', { task: 'task-2' })
    await post(port, '/api/orders/ship', { orderId: '1042' })
    push('task-2 single (correct target #1042 shipped)', runGrader(tmp, 'task-2'), runCheck('task-2', tmp))

    await post(port, '/api/reset', { task: 'task-2' })
    await post(port, '/api/orders/ship', { orderId: '1047' })
    push('task-2 single (wrong target #1047 shipped)', runGrader(tmp, 'task-2'), runCheck('task-2', tmp))

    await post(port, '/api/reset', { task: 'task-2' })
    await post(port, '/api/orders/ship', { orderId: '1042' })
    await post(port, '/api/orders/ship', { orderId: '1047' })
    push('task-2 single (both shipped)', runGrader(tmp, 'task-2'), runCheck('task-2', tmp))

    await post(port, '/api/reset', { task: 'task-2' })
    push('task-2 single (nothing done)', runGrader(tmp, 'task-2'), runCheck('task-2', tmp))

    // ---- task-3 ----
    for (const mode of ['ok', 'empty', 'missing']) {
      await post(port, '/api/reset', { task: 'task-3', mode })
      await post(port, '/api/download', {})
      await sleep(1800) // simulated download settles
      push('task-3 ' + mode + ' (agent clicked download)', runGrader(tmp, 'task-3'), runCheck('task-3', tmp))
    }

    // task-3 wrong-checksum content (agent/corruption gave different bytes)
    await post(port, '/api/reset', { task: 'task-3', mode: 'ok' })
    await post(port, '/api/download', {})
    await sleep(1800)
    fs.writeFileSync(path.join(tmp, 'state', 'downloads', REPORT_FILE), 'WRONG,content\n')
    push('task-3 ok but artifact content tampered', runGrader(tmp, 'task-3'), runCheck('task-3', tmp))

    // ---- BLOCKED agreement: state.json missing ----
    fs.renameSync(path.join(tmp, 'state', 'state.json'), path.join(tmp, 'state', 'state.json.bak'))
    const gb = runGrader(tmp, 'task-1')
    const cb = runCheck('task-1', tmp)
    fs.renameSync(path.join(tmp, 'state', 'state.json.bak'), path.join(tmp, 'state', 'state.json'))
    push('task-1 missing state.json (BLOCKED channel)', gb, cb)
  } finally {
    child.kill()
  }

  // Record the agreement matrix.
  const mdLines = [
    '# Gate checker vs final evaluator — cross-check agreement (pre-registration)',
    '',
    'Date: ' + new Date().toISOString(),
    'Method: both channels read the same authoritative `fixtures/state/` on a',
    'TEMP copy (live experiment state untouched); `gate/check.js` never imports',
    '`fixtures/grader.js`. Verdicts compared per task/mode PASS/FAIL state.',
    '',
    '| State | grader (fixtures/grader.js) | gate (gate/check.js) | agree |',
    '|---|---|---|---|',
    ...rows.map(
      (r) => '| ' + r.state + ' | ' + r.grader + ' | ' + r.check + ' | ' + (r.agree ? 'yes' : '**NO**') + ' |',
    ),
    '',
    'Agreement: ' + rows.filter((r) => r.agree).length + '/' + rows.length,
  ]
  const outPath = path.join(REPO, 'results', 'gate-checker-agreement.md')
  fs.writeFileSync(outPath, mdLines.join('\n') + '\n')

  const disagreed = rows.filter((r) => !r.agree)
  assert.equal(disagreed.length, 0, 'verdict disagreement: ' + JSON.stringify(disagreed, null, 2))
  console.log(
    'cross-check agreement: ' + rows.filter((r) => r.agree).length + '/' + rows.length +
      ' — recorded at results/gate-checker-agreement.md',
  )
})