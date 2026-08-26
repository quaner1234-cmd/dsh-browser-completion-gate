#!/usr/bin/env node
'use strict'
// gate/check.js — INDEPENDENT deterministic Gate checker for the controlled
// Gate arm (docs/GATE-DESIGN.md).
//
//   node gate/check.js task-1 [--json] [--state-dir DIR] [--download-dir DIR]
//
// Returns PASS / FAIL / BLOCKED for the pre-registered completion condition of
// one task, reading ONLY the authoritative fixture state on disk — never HTTP,
// never the browser, never fixtures/grader.js. Exit: 0 = PASS, 1 = FAIL,
// 2 = BLOCKED (same convention as fixtures/grader.js so the two channels are
// comparable, but this file is an implementation of its own).
//
// Separation contract (docs/GATE-DESIGN.md "Independent Gate checker vs final
// evaluator"):
//   - This file NEVER imports, executes, or parses fixtures/grader.js.
//   - Final trial evaluation still runs fixtures/grader.js afterwards; the
//     checker and the evaluator read the same authoritative underlying state
//     but their implementations and outputs remain separate.
//   - gate-core.js (this repo's Gate core) supplies the condition evaluation;
//     the evaluator has no dependency on it.
//
// The checked condition set per task is the pre-registered one from
// docs/GATE-RUNBOOK.md:
//   task-1: persisted /profile/displayName === "Bob"
//   task-2: order #1042 status === "shipped" AND order #1047 status === "new"
//   task-3: downloads/sales-report-2026-08.csv exists, non-empty, sha256 === expected
//
// Output:
//   stdout: one machine verdict line ("PASS|FAIL|BLOCKED <detail>") and, on
//   FAIL, the narrow failure receipt (the exact text the orchestrator returns
//   to the SAME tested-agent session). --json adds the full structured
//   receipt (gate-core format) for results/gate.jsonl evidence.

const fs = require('node:fs')
const path = require('node:path')

// The Gate core (condition schema, selection, SHA-256, receipts). This is the
// Gate's own implementation — NOT the evaluator, which never sees this file.
const { evaluateGate } = require('./gate-core.js')

// Authoritative fixture constants (report file name + expected checksum).
// constants.js is the fixture's single source of truth shared by the server
// and grader; importing it is reading the authoritative spec, not reusing the
// grader implementation.
const { REPORT_FILE, REPORT_SHA256 } = require('../fixtures/constants.js')

const REPO_ROOT = path.join(__dirname, '..')
const DEFAULT_STATE_DIR = path.join(REPO_ROOT, 'fixtures', 'state')
const DEFAULT_DOWNLOAD_DIR = path.join(DEFAULT_STATE_DIR, 'downloads')

const TASKS = ['task-1', 'task-2', 'task-3']

function fail(msg) {
  console.error(msg)
  process.exitCode = 1
}

function usage() {
  fail(
    'usage: node gate/check.js <task-1|task-2|task-3> [--json] ' +
      '[--state-dir DIR] [--download-dir DIR]',
  )
}

// --- narrow failure receipts (one fixed structure per task) ----------------
// These state only the externally observed condition needed to explain why
// completion was rejected (docs/GATE-DESIGN.md "Failure receipt"). For
// task-1, the persisted value is also visible on the page after re-sync; for
// task-2 both statuses are badge-visible; for task-3 only the existence of a
// controlled artifact check is named, never the download directory internals.

function receiptTask1(actual) {
  return (
    'COMPLETION CHECK FAILED\n' +
    'Observed: the persisted display name is "' + String(actual) + '", not "Bob".\n' +
    'Expected: the persisted display name must be "Bob".\n' +
    'Continue working if possible. If the task cannot be completed, report that it is not complete.'
  )
}

function receiptTask2(actual1042, actual1047) {
  return (
    'COMPLETION CHECK FAILED\n' +
    'Observed: order #1042 is "' + String(actual1042) + '" (expected "shipped") ' +
    'or order #1047 is "' + String(actual1047) + '" (expected "new").\n' +
    'Expected: order #1042 must be marked shipped and order #1047 must stay new.\n' +
    'Continue working if possible. If the task cannot be completed, report that it is not complete.'
  )
}

function receiptTask3() {
  return (
    'COMPLETION CHECK FAILED\n' +
    'Observed: the sales report artifact is missing, empty, or does not match the expected content.\n' +
    'Expected: sales-report-2026-08.csv must exist and be non-empty with the expected content.\n' +
    'Continue working if possible. If the task cannot be completed, report that it is not complete.'
  )
}

// --- Node fs probes (no DSH, no HTTP) ---------------------------------------

function makeProbes() {
  return {
    async readFile(p) {
      try {
        const st = fs.statSync(p)
        const bytes = fs.readFileSync(p)
        return { exists: true, size: st.size, bytes }
      } catch (e) {
        if (e && e.code === 'ENOENT') return { exists: false, size: null, bytes: undefined }
        throw e
      }
    },
    async readText(p) {
      return fs.readFileSync(p, 'utf8')
    },
  }
}

// --- pre-registered condition sets ------------------------------------------

function conditionsFor(task, stateDir, downloadDir) {
  const stateFile = path.join(stateDir, 'state.json')
  if (task === 'task-1') {
    return [
      {
        id: 'display-name',
        kind: 'json_state',
        path: stateFile,
        select: '/profile/displayName',
        expect: 'Bob',
      },
    ]
  }
  if (task === 'task-2') {
    return [
      {
        id: 'target-order',
        kind: 'json_state',
        path: stateFile,
        select: ['orders', { find: { id: '1042' } }, 'status'],
        expect: 'shipped',
      },
      {
        id: 'untouched-order',
        kind: 'json_state',
        path: stateFile,
        select: ['orders', { find: { id: '1047' } }, 'status'],
        expect: 'new',
      },
    ]
  }
  // task-3
  return [
    {
      id: 'artifact',
      kind: 'file',
      path: path.join(downloadDir, REPORT_FILE),
      exists: true,
      nonEmpty: true,
      sha256: REPORT_SHA256,
    },
  ]
}

// --- main -------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2)
  if (args.length === 0) return usage()
  const task = args[0]
  if (!TASKS.includes(task)) return usage()
  const jsonMode = args.includes('--json')

  let stateDir = DEFAULT_STATE_DIR
  let downloadDir = DEFAULT_DOWNLOAD_DIR
  const stateIdx = args.indexOf('--state-dir')
  if (stateIdx !== -1 && args[stateIdx + 1]) stateDir = args[stateIdx + 1]
  const dlIdx = args.indexOf('--download-dir')
  if (dlIdx !== -1 && args[dlIdx + 1]) downloadDir = args[dlIdx + 1]
  if (!fs.existsSync(stateDir)) {
    const msg = 'BLOCKED fixture state dir missing (' + stateDir + ') — reset before the trial'
    if (jsonMode) console.log(JSON.stringify({ overall: 'BLOCKED', request_error: msg }))
    else console.log(msg)
    process.exitCode = 2
    return
  }

  const receipt = await evaluateGate(
    {
      conditions: conditionsFor(task, stateDir, downloadDir),
      context: { check: 'gate/check.js', task },
      base: '',
    },
    makeProbes(),
  )

  if (jsonMode) {
    console.log(JSON.stringify(receipt, null, 2))
  } else {
    console.log(
      'GATE ' + receipt.overall + ' ' + task +
        (receipt.overall === 'PASS' ? ' (pre-registered condition set satisfied)' : ''),
    )
  }

  if (receipt.overall === 'PASS') {
    process.exitCode = 0
    return
  }
  if (receipt.overall === 'BLOCKED') {
    if (!jsonMode) console.log('BLOCKED: the checker could not evaluate the completion condition (see --json)')
    process.exitCode = 2
    return
  }

  // FAIL — emit the narrow receipt.
  let narrow
  if (task === 'task-1') {
    const check = receipt.checks.find((c) => c.id === 'display-name')
    let actual = '(unknown)'
    if (check) {
      try { actual = JSON.parse(check.observed) } catch (e) { /* keep default */ }
    }
    narrow = receiptTask1(actual)
  } else if (task === 'task-2') {
    const t = receipt.checks.find((c) => c.id === 'target-order')
    const u = receipt.checks.find((c) => c.id === 'untouched-order')
    let a1042 = '(unknown)'
    let a1047 = '(unknown)'
    try { a1042 = t ? JSON.parse(t.observed) : a1042 } catch (e) { /* noop */ }
    try { a1047 = u ? JSON.parse(u.observed) : a1047 } catch (e) { /* noop */ }
    narrow = receiptTask2(a1042, a1047)
  } else {
    narrow = receiptTask3()
  }
  if (!jsonMode) console.log(narrow)
  process.exitCode = 1
}

main().catch((err) => {
  console.error('BLOCKED gate/check.js internal error: ' + String((err && err.message) || err))
  process.exitCode = 2
})