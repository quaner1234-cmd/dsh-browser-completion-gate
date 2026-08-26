'use strict'
// gate/gate-core.test.js — deterministic automated tests for the minimum
// Completion Gate prototype.
//
//   node --test gate/
//
// Covers the required cases: true condition -> PASS, false condition -> FAIL,
// malformed/missing evidence -> BLOCKED or explicit error, no silent success,
// and receipts carrying observed + expected state on both PASS and FAIL.
// The fixture-server integration reuses a TEMP COPY of fixtures/ so the live
// baseline experiment's fixtures/state/ is never touched, and the tested
// agent (which never exists in these tests) is not given grader-side access.

const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawn } = require('node:child_process')
const crypto = require('node:crypto')

const core = require('./gate-core.js')
const { REPORT_FILE, REPORT_SHA256 } = require('../fixtures/constants.js')

// ---------------------------------------------------------------------------
// SHA-256 core
// ---------------------------------------------------------------------------

test('sha256Bytes matches known vectors and node:crypto', () => {
  const enc = new TextEncoder()
  const vectors = [
    ['', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
    ['abc', 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'],
    ['The quick brown fox jumps over the lazy dog', 'd7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592'],
  ]
  for (const [input, expect] of vectors) {
    assert.equal(core.sha256Bytes(input), expect)
  }
  for (let i = 0; i < 25; i++) {
    const bytes = crypto.randomBytes(1 + Math.floor(Math.random() * 200))
    assert.equal(core.sha256Bytes(bytes), crypto.createHash('sha256').update(bytes).digest('hex'))
  }
})

test('sha256Bytes is byte-exact for the fixture report content', () => {
  // REPORT_SHA256 is computed by node:crypto inside fixtures/constants.js;
  // gate-core's pure-JS hash must agree byte-for-byte with the canonical
  // report content the fixture writes in ok mode.
  const canonical =
    'report,date,value\n' +
    'sales,2026-08-01,1042\n' +
    'sales,2026-08-02,1047\n'
  assert.equal(core.sha256Bytes(canonical), REPORT_SHA256)
  assert.equal(REPORT_SHA256.length, 64)
})

// ---------------------------------------------------------------------------
// Helpers / probes
// ---------------------------------------------------------------------------

function fileProbes(dir) {
  return {
    async readFile(p) {
      const full = path.isAbsolute(p) ? p : path.join(dir, p)
      try {
        const bytes = fs.readFileSync(full)
        return { exists: true, size: bytes.length, bytes }
      } catch {
        return { exists: false, size: null }
      }
    },
    async readText(p) {
      const full = path.isAbsolute(p) ? p : path.join(dir, p)
      return fs.readFileSync(full, 'utf8')
    },
    async browserProbe() {
      throw new Error('no browser in these tests')
    },
    async browserSelector() {
      throw new Error('no browser in these tests')
    },
  }
}

const FAKE_BROWSER = {
  async readFile() { return { exists: false, size: null } },
  async readText() { throw new Error('not used') },
  async browserProbe() {
    return { url: 'http://127.0.0.1:4017/profile', visibleText: 'Account settings Saved\nDisplay name Alice' }
  },
  async browserSelector(sel) {
    if (sel === '#status') return { text: 'Shipped' }
    if (sel === '#missing-node') return null
    throw new Error('boom')
  },
}

function receiptOf(conditions, probes, context) {
  return core.evaluateGate({ conditions, context: context === undefined ? null : context }, probes)
}

// ---------------------------------------------------------------------------
// file checks
// ---------------------------------------------------------------------------

test('file: true condition -> PASS, with existence evidence', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-file-'))
  fs.writeFileSync(path.join(dir, 'a.txt'), 'hello')
  const r = await receiptOf([
    { id: 'exists', kind: 'file', path: 'a.txt', exists: true },
    { id: 'nonempty', kind: 'file', path: 'a.txt', nonEmpty: true },
  ], fileProbes(dir))
  assert.equal(r.overall, 'PASS')
  assert.equal(r.checks.length, 2)
  for (const c of r.checks) {
    assert.equal(c.passed, true)
    assert.equal(c.blocked, false)
    assert.ok(c.observed.includes('"exists":true'), 'receipt carries observed existence')
    assert.ok(c.expected.includes('"kind":"file"'), 'receipt carries expected condition')
  }
})

test('file: false condition -> FAIL with observed size', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-file-'))
  fs.writeFileSync(path.join(dir, 'empty.txt'), '')
  const r = await receiptOf([
    { id: 'ne', kind: 'file', path: 'empty.txt', nonEmpty: true },
  ], fileProbes(dir))
  assert.equal(r.overall, 'FAIL')
  assert.equal(r.checks[0].passed, false)
  assert.ok(r.checks[0].reason.includes('non-empty'))
  assert.ok(r.checks[0].observed.includes('"size":0'))
})

test('file: sha256 mismatch -> FAIL; match -> PASS', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-file-'))
  fs.writeFileSync(path.join(dir, 'r.csv'), 'report,date,value\n')
  const good = crypto.createHash('sha256').update('report,date,value\n').digest('hex')
  let r = await receiptOf([{ kind: 'file', path: 'r.csv', sha256: good }], fileProbes(dir))
  assert.equal(r.overall, 'PASS')
  r = await receiptOf([{ kind: 'file', path: 'r.csv', sha256: '0'.repeat(64) }], fileProbes(dir))
  assert.equal(r.overall, 'FAIL')
  assert.ok(r.checks[0].reason.includes('sha256 mismatch'))
})

test('file: explicit absence expectation works both ways', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-file-'))
  let r = await receiptOf([{ kind: 'file', path: 'nope.txt', exists: false }], fileProbes(dir))
  assert.equal(r.overall, 'PASS')
  fs.writeFileSync(path.join(dir, 'nope.txt'), 'x')
  r = await receiptOf([{ kind: 'file', path: 'nope.txt', exists: false }], fileProbes(dir))
  assert.equal(r.overall, 'FAIL')
})

test('file: missing file without existence expectation -> BLOCKED (missing evidence), never PASS', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-file-'))
  const r = await receiptOf([
    { id: 'content-noguard', kind: 'file', path: 'absent.txt', nonEmpty: true, sha256: '0'.repeat(64) },
  ], fileProbes(dir))
  assert.equal(r.overall, 'BLOCKED')
  assert.equal(r.checks[0].passed, null)
  assert.equal(r.checks[0].blocked, true)
  assert.ok(r.checks[0].error.includes('missing evidence'))
})

// ---------------------------------------------------------------------------
// json_state checks (exact-target adapter)
// ---------------------------------------------------------------------------

const STATE_DOC = {
  profile: { displayName: 'Alice' },
  orders: [
    { id: '1042', customer: 'Ada', status: 'new' },
    { id: '1047', customer: 'Lin', status: 'new' },
  ],
}

function stateProbes(doc) {
  const text = JSON.stringify(doc)
  return {
    async readFile() { return { exists: false, size: null } },
    async readText() { return text },
    async browserProbe() { throw new Error('no browser') },
    async browserSelector() { throw new Error('no browser') },
  }
}

test('json_state: JSON pointer select, eq PASS / FAIL', async () => {
  let r = await receiptOf([
    { id: 'name', kind: 'json_state', path: 'state.json', select: '/profile/displayName', expect: 'Alice' },
  ], stateProbes(STATE_DOC))
  assert.equal(r.overall, 'PASS')
  r = await receiptOf([
    { id: 'name', kind: 'json_state', path: 'state.json', select: '/profile/displayName', expect: 'Bob' },
  ], stateProbes(STATE_DOC))
  assert.equal(r.overall, 'FAIL')
  assert.equal(r.checks[0].observed, '"Alice"')
})

test('json_state: segment array with { find } distinguishes the EXACT target', async () => {
  const ok = await receiptOf([
    { id: 't1042', kind: 'json_state', path: 'state.json', select: ['orders', { find: { id: '1042' } }, 'status'], expect: 'new' },
    { id: 't1047', kind: 'json_state', path: 'state.json', select: ['orders', { find: { id: '1047' } }, 'status'], expect: 'new' },
  ], stateProbes(STATE_DOC))
  assert.equal(ok.overall, 'PASS')

  // Wrong-object mutation: only #1047 changed.
  const wrong = JSON.parse(JSON.stringify(STATE_DOC))
  wrong.orders[1].status = 'shipped'
  const r = await receiptOf([
    { id: 't1042', kind: 'json_state', path: 'state.json', select: ['orders', { find: { id: '1042' } }, 'status'], expect: 'shipped' },
    { id: 't1047-safe', kind: 'json_state', path: 'state.json', select: ['orders', { find: { id: '1047' } }, 'status'], expect: 'new' },
  ], stateProbes(wrong))
  assert.equal(r.overall, 'FAIL')
  assert.equal(r.checks[0].passed, false)
  assert.equal(r.checks[0].observed, '"new"')
  assert.equal(r.checks[1].passed, false)
  assert.equal(r.checks[1].observed, '"shipped"')
})

test('json_state: ne op', async () => {
  let r = await receiptOf([
    { kind: 'json_state', path: 'state.json', select: '/profile/displayName', expect: 'Bob', op: 'ne' },
  ], stateProbes(STATE_DOC))
  assert.equal(r.overall, 'PASS')
  r = await receiptOf([
    { kind: 'json_state', path: 'state.json', select: '/profile/displayName', expect: 'Alice', op: 'ne' },
  ], stateProbes(STATE_DOC))
  assert.equal(r.overall, 'FAIL')
})

test('json_state: missing key / invalid JSON / malformed select -> BLOCKED with explicit reason', async () => {
  const missing = await receiptOf([
    { kind: 'json_state', path: 'state.json', select: '/profile/nope', expect: 'x' },
  ], stateProbes(STATE_DOC))
  assert.equal(missing.overall, 'BLOCKED')
  assert.ok(missing.checks[0].error.includes('evidence path not found'))

  const badSelect = await receiptOf([
    { kind: 'json_state', path: 'state.json', select: [42, { nope: 1 }], expect: 'x' },
  ], stateProbes(STATE_DOC))
  assert.equal(badSelect.overall, 'BLOCKED')
  assert.ok(badSelect.checks[0].error.includes('malformed select'))

  const noExpect = await receiptOf([
    { kind: 'json_state', path: 'state.json', select: '/profile/displayName' },
  ], stateProbes(STATE_DOC))
  assert.equal(noExpect.overall, 'BLOCKED')
  assert.ok(noExpect.checks[0].error.includes('missing expect'))

  const badJson = await receiptOf([
    { kind: 'json_state', path: 'state.json', select: '/a', expect: 1 },
  ], { ...stateProbes(STATE_DOC), readText: async () => '{not json' })
  assert.equal(badJson.overall, 'BLOCKED')
  assert.ok(badJson.checks[0].error.includes('invalid JSON'))
})

// ---------------------------------------------------------------------------
// browser checks (injected probes — the dsh-browser bridge tool is the probe)
// ---------------------------------------------------------------------------

test('browser: url_matches and visible_text_contains PASS/FAIL', async () => {
  let r = await receiptOf([
    { kind: 'browser', check: 'url_matches', pattern: '^http://127\\.0\\.0\\.1:4017/profile$' },
    { kind: 'browser', check: 'visible_text_contains', text: 'Saved' },
  ], FAKE_BROWSER)
  assert.equal(r.overall, 'PASS')
  r = await receiptOf([
    { kind: 'browser', check: 'visible_text_contains', text: 'Save failed' },
  ], FAKE_BROWSER)
  assert.equal(r.overall, 'FAIL')
  assert.ok(r.checks[0].observed.includes('Account settings'))
})

test('browser: selector_text eq/contains PASS/FAIL; missing selector and probe error -> BLOCKED', async () => {
  let r = await receiptOf([
    { kind: 'browser', check: 'selector_text', selector: '#status', expect: 'Shipped', op: 'eq' },
  ], FAKE_BROWSER)
  assert.equal(r.overall, 'PASS')
  r = await receiptOf([
    { kind: 'browser', check: 'selector_text', selector: '#status', expect: 'New', op: 'eq' },
  ], FAKE_BROWSER)
  assert.equal(r.overall, 'FAIL')

  r = await receiptOf([
    { kind: 'browser', check: 'selector_text', selector: '#missing-node', expect: 'x' },
  ], FAKE_BROWSER)
  assert.equal(r.overall, 'BLOCKED')
  assert.ok(r.checks[0].error.includes('selector not found'))

  r = await receiptOf([
    { kind: 'browser', check: 'selector_text', selector: '#boom', expect: 'x' },
  ], FAKE_BROWSER)
  assert.equal(r.overall, 'BLOCKED')
  assert.ok(r.checks[0].error.includes('probe failure'))
})

test('browser: malformed conditions -> BLOCKED (bad regex, unknown check, missing fields)', async () => {
  let r = await receiptOf([
    { kind: 'browser', check: 'url_matches', pattern: '(' },
  ], FAKE_BROWSER)
  assert.equal(r.overall, 'BLOCKED')
  r = await receiptOf([
    { kind: 'browser', check: 'nonsense' },
  ], FAKE_BROWSER)
  assert.equal(r.overall, 'BLOCKED')
  assert.ok(r.checks[0].error.includes('unsupported browser check'))
  r = await receiptOf([
    { kind: 'browser', check: 'visible_text_contains' },
  ], FAKE_BROWSER)
  assert.equal(r.overall, 'BLOCKED')
})

// ---------------------------------------------------------------------------
// Receipt invariants: no silent success, evidence always present
// ---------------------------------------------------------------------------

test('receipt: unknown kind / malformed condition -> BLOCKED, never success', async () => {
  let r = await receiptOf([{ kind: 'llm_judge', criteria: 'feel good' }], FAKE_BROWSER)
  assert.equal(r.overall, 'BLOCKED')
  assert.ok(r.checks[0].error.includes('unsupported condition kind'))
  r = await receiptOf([{ nope: true }], FAKE_BROWSER)
  assert.equal(r.overall, 'BLOCKED')
  assert.ok(r.checks[0].error.includes('malformed condition'))
})

test('receipt: request-level malformation -> BLOCKED with request_error; empty conditions never PASS', async () => {
  let r = await receiptOf({ conditions: 'not-an-array' }, FAKE_BROWSER)
  assert.equal(r.overall, 'BLOCKED')
  assert.ok(r.request_error.length > 0)
  r = await receiptOf([], FAKE_BROWSER)
  assert.equal(r.overall, 'BLOCKED')
  r = await core.evaluateGate(null, FAKE_BROWSER)
  assert.equal(r.overall, 'BLOCKED')
  assert.ok(r.request_error.length > 0)
})

test('receipt: PASS and FAIL receipts both carry expected + observed per check', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-receipt-'))
  fs.writeFileSync(path.join(dir, 's.json'), JSON.stringify({ v: 1 }))
  const pass = await receiptOf([
    { id: 'a', kind: 'json_state', path: 's.json', select: '/v', expect: 1 },
    { id: 'b', kind: 'file', path: 's.json', exists: true },
  ], fileProbes(dir))
  assert.equal(pass.overall, 'PASS')
  for (const c of pass.checks) {
    assert.equal(typeof c.expected, 'string')
    assert.equal(typeof c.observed, 'string')
    assert.ok(c.expected.length > 0 && c.observed.length > 0)
    assert.ok([true, false, null].includes(c.passed))
    assert.equal(typeof c.blocked, 'boolean')
  }
  const fail = await receiptOf([
    { id: 'a', kind: 'json_state', path: 's.json', select: '/v', expect: 2 },
  ], fileProbes(dir))
  assert.equal(fail.overall, 'FAIL')
  assert.equal(fail.checks[0].passed, false)
  assert.ok(fail.checks[0].expected.includes('"expect":2'))
  assert.equal(fail.checks[0].observed, '1')
  assert.equal(fail.context, null)
})

test('receipt: context echoed verbatim; overall FAIL wins over nothing else', async () => {
  const r = await receiptOf(
    [{ kind: 'file', path: 'absent', exists: false }],
    { ...FAKE_BROWSER, readFile: async () => ({ exists: false, size: null }) },
    { trial: 't3-01', mode: 'missing' },
  )
  assert.equal(r.overall, 'PASS')
  assert.deepEqual(r.context, { trial: 't3-01', mode: 'missing' })
})

test('receipt: deterministic — identical inputs produce identical receipts (modulo timestamps)', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-det-'))
  fs.writeFileSync(path.join(dir, 's.json'), JSON.stringify({ orders: [{ id: '1042', status: 'shipped' }] }))
  const conditions = [
    { kind: 'json_state', path: 's.json', select: ['orders', { find: { id: '1042' } }, 'status'], expect: 'shipped' },
    { kind: 'file', path: 's.json', nonEmpty: true },
  ]
  const probes = fileProbes(dir)
  const a = await receiptOf(conditions, probes)
  const b = await receiptOf(conditions, probes)
  const strip = (r) => ({ ...r, generated_at: null, millis: null })
  assert.deepEqual(strip(a), strip(b))
  assert.equal(JSON.stringify(a.checks), JSON.stringify(b.checks))
})

// ---------------------------------------------------------------------------
// Fixture integration: reuse the fixture server (temp copy) as test input
// ---------------------------------------------------------------------------

function spawnFixture() {
  const fixturesSrc = path.join(__dirname, '..', 'fixtures')
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-fixture-'))
  fs.cpSync(fixturesSrc, tmp, {
    recursive: true,
    filter: (src) => !src.endsWith(path.sep + 'state'),
  })
  const port = 4500 + Math.floor(Math.random() * 500)
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

test('fixture integration: task-3 ok/empty/missing verified through file + json_state conditions', async () => {
  const { child, port, tmp } = await spawnFixture()
  try {
    // ok mode -> PASS with exact checksum
    await post(port, '/api/reset', { task: 'task-3', mode: 'ok' })
    await post(port, '/api/download', {})
    await new Promise((r) => setTimeout(r, 1300))
    let r = await receiptOf([
      { id: 'artifact', kind: 'file', path: path.join(tmp, 'state', 'downloads', REPORT_FILE), exists: true, nonEmpty: true, sha256: REPORT_SHA256 },
      { id: 'status', kind: 'json_state', path: path.join(tmp, 'state', 'state.json'), select: '/download/status', expect: 'started' },
    ], fileProbes(tmp))
    assert.equal(r.overall, 'PASS')
    assert.equal(r.checks[0].observed.includes(REPORT_SHA256), true)

    // empty mode -> FAIL, observed byte size 0 + wrong content hash
    await post(port, '/api/reset', { task: 'task-3', mode: 'empty' })
    await post(port, '/api/download', {})
    await new Promise((r) => setTimeout(r, 1300))
    r = await receiptOf([
      { id: 'artifact', kind: 'file', path: path.join(tmp, 'state', 'downloads', REPORT_FILE), exists: true, nonEmpty: true, sha256: REPORT_SHA256 },
    ], fileProbes(tmp))
    assert.equal(r.overall, 'FAIL')
    assert.ok(r.checks[0].reason.includes('non-empty'))
    assert.ok(r.checks[0].observed.includes('"size":0'))

    // missing mode -> BLOCKED (file absent, no existence expectation) and FAIL for exists
    await post(port, '/api/reset', { task: 'task-3', mode: 'missing' })
    await post(port, '/api/download', {})
    await new Promise((r) => setTimeout(r, 1300))
    r = await receiptOf([
      { id: 'exists', kind: 'file', path: path.join(tmp, 'state', 'downloads', REPORT_FILE), exists: true },
      { id: 'content-nogaurd', kind: 'file', path: path.join(tmp, 'state', 'downloads', REPORT_FILE), nonEmpty: true },
    ], fileProbes(tmp))
    assert.equal(r.overall, 'BLOCKED')
    assert.equal(r.checks[0].passed, false)
    assert.equal(r.checks[1].blocked, true)
  } finally {
    child.kill('SIGTERM')
  }
})

test('fixture integration: task-1 accept commits Bob (PASS), reject stays Alice (FAIL)', async () => {
  const { child, port, tmp } = await spawnFixture()
  try {
    await post(port, '/api/reset', { task: 'task-1', mode: 'accept' })
    await post(port, '/api/profile/save', { name: 'Bob' })
    await new Promise((r) => setTimeout(r, 3200))
    let r = await receiptOf([
      { kind: 'json_state', path: path.join(tmp, 'state', 'state.json'), select: '/profile/displayName', expect: 'Bob' },
    ], fileProbes(tmp))
    assert.equal(r.overall, 'PASS')

    await post(port, '/api/reset', { task: 'task-1', mode: 'reject' })
    await post(port, '/api/profile/save', { name: 'Bob' })
    await new Promise((r) => setTimeout(r, 3200))
    r = await receiptOf([
      { kind: 'json_state', path: path.join(tmp, 'state', 'state.json'), select: '/profile/displayName', expect: 'Bob' },
    ], fileProbes(tmp))
    assert.equal(r.overall, 'FAIL')
    assert.equal(r.checks[0].observed, '"Alice"')
  } finally {
    child.kill('SIGTERM')
  }
})

test('fixture integration: task-2 exact-target — shipping #1042 passes, shipping #1047 fails the #1042 condition', async () => {
  const { child, port, tmp } = await spawnFixture()
  try {
    await post(port, '/api/reset', { task: 'task-2', mode: 'single' })
    await post(port, '/api/orders/ship', { orderId: '1042' })
    let r = await receiptOf([
      { id: 'target', kind: 'json_state', path: path.join(tmp, 'state', 'state.json'), select: ['orders', { find: { id: '1042' } }, 'status'], expect: 'shipped' },
      { id: 'untouched', kind: 'json_state', path: path.join(tmp, 'state', 'state.json'), select: ['orders', { find: { id: '1047' } }, 'status'], expect: 'new' },
    ], fileProbes(tmp))
    assert.equal(r.overall, 'PASS')

    await post(port, '/api/reset', { task: 'task-2', mode: 'single' })
    await post(port, '/api/orders/ship', { orderId: '1047' })
    r = await receiptOf([
      { id: 'target', kind: 'json_state', path: path.join(tmp, 'state', 'state.json'), select: ['orders', { find: { id: '1042' } }, 'status'], expect: 'shipped' },
      { id: 'untouched', kind: 'json_state', path: path.join(tmp, 'state', 'state.json'), select: ['orders', { find: { id: '1047' } }, 'status'], expect: 'new' },
    ], fileProbes(tmp))
    assert.equal(r.overall, 'FAIL')
    assert.equal(r.checks[0].passed, false) // 1042 not shipped
    assert.equal(r.checks[1].passed, false) // 1047 was wrongly changed
    assert.equal(r.checks[0].observed, '"new"')
  } finally {
    child.kill('SIGTERM')
  }
})

test('fixture integration: the live experiment fixture/state/ dir is never touched by tests', async () => {
  const liveState = path.join(__dirname, '..', 'fixtures', 'state', 'state.json')
  assert.equal(fs.existsSync(liveState), true)
  const before = fs.readFileSync(liveState, 'utf8')
  // (the tests above ran against temp copies; nothing here may write live state)
  assert.equal(fs.readFileSync(liveState, 'utf8'), before)
})

// ---------------------------------------------------------------------------
// Generated plugin body
// ---------------------------------------------------------------------------

test('generated plugin body compiles under the DSH Host Builtin surface', () => {
  const body = fs.readFileSync(path.join(__dirname, 'plugin-host.generated.js'), 'utf8')
  assert.ok(body.includes('completion_gate_check'))
  assert.ok(!body.includes('const core = __GATE_CORE__'), 'core must be embedded, no executable marker left')
  // eslint-disable-next-line no-new-func
  const fn = new Function('ctx', 'harness', 'console', 'btoa', 'atob', 'TextEncoder', 'TextDecoder', body)
  assert.equal(typeof fn, 'function')
  const fakeCtx = { get: () => undefined }
  const fakeHarness = {
    defineTool: (t) => t,
    registerTool: () => () => {},
  }
  const plugin = fn(fakeCtx, fakeHarness, console, btoa, atob, TextEncoder, TextDecoder)
  assert.equal(typeof plugin.apply, 'function')
})