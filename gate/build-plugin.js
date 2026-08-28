#!/usr/bin/env node
'use strict'
// gate/build-plugin.js — LEGACY build step for the dynamic Host compatibility
// path. The PRIMARY runtime is the standard DSH bundle entry index.mjs, which
// imports gate/gate-core.js directly (no build step).
//
// This script embeds gate/gate-core.js (the deterministic core; CommonJS tail
// stripped) into gate/plugin-shell.js at the `__GATE_CORE__` marker and emits
// gate/plugin-host.generated.js: a single plain-JS function body, ready to be
// handed to cordis_define code.host (or mounted as an agent preset) WITHOUT
// any further build step tomorrow.
//
// The build also compiles the generated body with `new Function(...)` and the
// installed DSH evaluator's own Builtin list as parameter names, so a syntax
// error in the pasted body fails the build here, not at activation time.
//
// Usage: node gate/build-plugin.js   (idempotent; deterministic output)

const fs = require('node:fs')
const path = require('node:path')

const DIR = __dirname
const CORE = fs.readFileSync(path.join(DIR, 'gate-core.js'), 'utf8')
const SHELL = fs.readFileSync(path.join(DIR, 'plugin-shell.js'), 'utf8')

// 1. Strip gate-core's CommonJS tail (everything from the `if (typeof module`
//    guard to EOF) so the embed never touches `module` inside the evaluator.
const cjsTail = /\nif \(typeof module !== 'undefined' && module\.exports\) \{[\s\S]*$/
if (!cjsTail.test(CORE)) {
  console.error('[build] gate-core.js CommonJS tail not found; aborting')
  process.exit(1)
}
const coreBody = CORE.replace(cjsTail, '\n')

// 2. Wrap as an IIFE returning the api object (gate-core declares `api`
//    itself; only the CommonJS export tail is stripped above).
const embedded =
  '(function () {\n' +
  coreBody +
  '\nreturn api\n})()'

// 3. Replace the marker in the shell (exactly once).
const MARKER = 'const core = __GATE_CORE__'
const count = SHELL.split(MARKER).length - 1
if (count !== 1) {
  console.error('[build] expected exactly one __GATE_CORE__ marker, found ' + count + '; aborting')
  process.exit(1)
}
const body = SHELL.replace(MARKER, 'const core = ' + embedded)

// 4. Emit the paste-ready function body.
const out = path.join(DIR, 'plugin-host.generated.js')
fs.writeFileSync(out, body + '\n')

// 5. Compile check with the DSH Host evaluator's Builtin parameter names
//    (ctx, harness, console, btoa, atob, TextEncoder, TextDecoder). Compiling
//    does not execute the body; apply() only runs when the plugin is mounted.
try {
  // eslint-disable-next-line no-new-func
  new Function('ctx', 'harness', 'console', 'btoa', 'atob', 'TextEncoder', 'TextDecoder', body)
} catch (e) {
  console.error('[build] generated body failed to compile: ' + e.message)
  process.exit(1)
}

console.log('[build] wrote ' + path.relative(process.cwd(), out) + ' (' + body.length + ' bytes, compiles OK)')