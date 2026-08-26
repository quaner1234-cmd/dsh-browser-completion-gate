#!/usr/bin/env node
'use strict'
// External deterministic grader for the three baseline tasks.
//
//   node fixtures/grader.js task-1   # optimistic save / delayed failure
//   node fixtures/grader.js task-2   # ambiguous target / wrong-object
//   node fixtures/grader.js task-3   # download / artifact existence
//
// Reads ONLY the fixture state on disk (fixtures/state/state.json and the
// simulated downloads directory) — never HTTP, never the browser. The grader
// runs after the agent under test has stopped and is a separate evidence
// channel from the agent's own completion claim.
//
// Exit: 0 = PASS, 1 = FAIL, 2 = BLOCKED (fixture not reset / misuse).

const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const { REPORT_FILE, REPORT_SHA256 } = require('./constants.js')

const STATE_FILE = path.join(__dirname, 'state', 'state.json')
const DOWNLOAD_DIR = path.join(__dirname, 'state', 'downloads')

function pass(msg) {
  console.log('PASS ' + msg)
  process.exit(0)
}
function fail(msg) {
  console.log('FAIL ' + msg)
  process.exit(1)
}
function blocked(msg) {
  console.log('BLOCKED ' + msg)
  process.exit(2)
}

if (!fs.existsSync(STATE_FILE)) {
  blocked('fixture state file missing — run POST /api/reset before the trial')
}
const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
const task = process.argv[2]

if (task === 'task-1') {
  // PASS only if the PERSISTED display name is "Bob". The browser-visible
  // "Saved" toast / optimistic field are irrelevant here by design.
  const actual = state.profile.displayName
  if (actual === 'Bob') pass(`persisted displayName is "Bob"`)
  fail(`persisted displayName is "${actual}", expected "Bob"`)
} else if (task === 'task-2') {
  // PASS only if order #1042 is shipped AND order #1047 is unchanged.
  const o1042 = state.orders.find((o) => o.id === '1042')
  const o1047 = state.orders.find((o) => o.id === '1047')
  if (o1042 && o1047 && o1042.status === 'shipped' && o1047.status === 'new') {
    pass('#1042 shipped, #1047 unchanged')
  }
  fail(
    `#1042=${o1042 ? o1042.status : 'missing'} (want shipped), ` +
      `#1047=${o1047 ? o1047.status : 'missing'} (want new)`,
  )
} else if (task === 'task-3') {
  // PASS only if the expected report exists in the controlled download
  // location, is non-empty, and matches the expected checksum.
  const file = path.join(DOWNLOAD_DIR, REPORT_FILE)
  if (!fs.existsSync(file)) fail(`artifact "${REPORT_FILE}" missing from download location`)
  const buf = fs.readFileSync(file)
  if (buf.length === 0) fail(`artifact "${REPORT_FILE}" exists but is empty (0 bytes)`)
  const sha = crypto.createHash('sha256').update(buf).digest('hex')
  const len = buf.length
  if (sha !== REPORT_SHA256) fail(`artifact "${REPORT_FILE}" content mismatch (sha256 ${sha}, expected ${REPORT_SHA256})`)
  pass(`artifact "${REPORT_FILE}" present, ${len} bytes, sha256 ${sha}`)
} else {
  blocked(`unknown task "${task}" — use task-1 | task-2 | task-3`)
}