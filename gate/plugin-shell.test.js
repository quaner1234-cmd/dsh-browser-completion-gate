'use strict'
// gate/plugin-shell.test.js — integration tests over the COMMITTED generated
// plugin artifact (gate/plugin-host.generated.js): the exact function body a
// user hands to cordis_define code.host. Drives apply() on the DSH Host
// Builtin surface (same parameter list as the build's compile check) with
// mock ctx/harness/tools/fs and verifies:
//   - the plugin mounts and registers completion_gate_check;
//   - conditionsPath resolves conditions from a user-editable JSON file;
//   - the sandbox cannot mount the guard directly: it registers lazily on the
//     executing agent's OWN tools scope (exec.agent.ctx) and denies configured
//     tool names until the last receipt is PASS;
//   - the guard disposer is owned by the plugin fiber (ctx.effect).
//
//   node --test gate/

const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const GENERATED = path.join(__dirname, 'plugin-host.generated.js')
const BODY = fs.readFileSync(GENERATED, 'utf8')

// The DSH Host evaluator invokes the body with these symbols (see
// gate/build-plugin.js). Compiling executes nothing; apply() runs on mount.
// eslint-disable-next-line no-new-func
const COMPILE = new Function('ctx', 'harness', 'console', 'btoa', 'atob', 'TextEncoder', 'TextDecoder', BODY)

function mountPlugin(dir) {
  const state = { tool: null, guards: [], effects: [] }
  const mocks = {
    fs: {
      async resolve(p) {
        return { path: path.isAbsolute(p) ? p : path.join(dir, p) }
      },
      async stat(target) {
        try {
          const st = fs.statSync(target.path)
          return { size: st.size }
        } catch {
          return undefined
        }
      },
      async readBytes(target) {
        return fs.readFileSync(target.path)
      },
      async readText(target) {
        return fs.readFileSync(target.path, 'utf8')
      },
    },
    tools: {
      guard(fn) {
        state.guards.push(fn)
        return () => {}
      },
      execute() {
        throw new Error('no browser in shell tests')
      },
    },
  }
  const ctx = {
    get(name) {
      return mocks[name]
    },
    effect(fn) {
      // The real runtime runs effect callbacks immediately and owns their
      // disposer; the mock must do the same or nothing registers.
      state.effects.push(fn)
      state.dispose = fn()
    },
  }
  const harness = {
    defineTool(t) {
      return t
    },
    registerTool(_ctx, t) {
      state.tool = t
      return () => {}
    },
  }
  const plugin = COMPILE(ctx, harness, console, btoa, atob, TextEncoder, TextDecoder)
  assert.equal(typeof plugin.apply, 'function')
  plugin.apply(ctx)
  assert.ok(state.tool, 'plugin must register a tool on mount')
  assert.equal(state.tool.name, 'completion_gate_check')
  assert.equal(typeof state.tool.execute, 'function')
  return { state, tool: state.tool, mocks }
}

// The plugin reaches the REAL tools service through the executing agent's own
// scoped context (exec.agent.ctx), mirroring the live DSH runtime — the
// sandbox ctx wrapper exposes only register/schemas/get.
function mkExec(mocks) {
  return {
    signal: undefined,
    agent: mocks
      ? { ctx: { get: (name) => mocks[name] } }
      : undefined,
  }
}

test('plugin mounts: registers completion_gate_check; guard registers lazily on first execution', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-shell-'))
  const { state } = mountPlugin(dir)
  assert.equal(state.guards.length, 0, 'no agent scope at mount — guard waits for the first execution')
  assert.equal(state.effects.length, 1)
  assert.equal(typeof state.dispose, 'function')
})

test('tool: file conditions -> real PASS receipt with expected + observed', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-shell-'))
  fs.writeFileSync(path.join(dir, 'ok.txt'), 'hello')
  const { tool, mocks } = mountPlugin(dir)
  const receipt = await tool.execute(
    { conditions: [{ id: 'ok', kind: 'file', path: 'ok.txt', exists: true, nonEmpty: true }] },
    mkExec(mocks),
  )
  assert.equal(receipt.gate, 'completion_gate_check')
  assert.equal(receipt.overall, 'PASS')
  assert.equal(receipt.checks.length, 1)
  assert.equal(receipt.checks[0].passed, true)
  assert.ok(receipt.checks[0].observed.includes('"exists":true'))
})

test('tool: conditionsPath reads a user-editable conditions file', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-shell-'))
  fs.writeFileSync(path.join(dir, 'state.json'), JSON.stringify({ status: 'done' }))
  fs.writeFileSync(
    path.join(dir, 'completion.conditions.json'),
    JSON.stringify([{ id: 's', kind: 'json_state', path: 'state.json', select: '/status', expect: 'done' }]),
  )
  const { tool, mocks } = mountPlugin(dir)
  const exec = mkExec(mocks)
  const receipt = await tool.execute({ conditionsPath: 'completion.conditions.json' }, exec)
  assert.equal(receipt.overall, 'PASS')
  assert.equal(receipt.checks[0].id, 's')
  // missing file stays BLOCKED, never a silent pass
  const blocked = await tool.execute({ conditionsPath: 'nope.json' }, exec)
  assert.equal(blocked.overall, 'BLOCKED')
  assert.ok(blocked.request_error.includes('cannot read conditionsPath'))
  // the lazy guard came up with the agent scope
  assert.equal(exec.agent.ctx.get('tools') !== undefined, true)
})

test('armed guard: denies denyTools while receipt is not PASS; PASS unlocks', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-shell-'))
  fs.writeFileSync(path.join(dir, 'ok.txt'), 'hello')
  const { state, tool, mocks } = mountPlugin(dir)
  const exec = mkExec(mocks)

  // FAIL receipt + arm -> listed tools denied with the gate reason
  const fail = await tool.execute(
    {
      conditions: [{ kind: 'file', path: 'ok.txt', exists: true, nonEmpty: true, minBytes: 999 }],
      arm: { denyTools: ['bash', 'stop'] },
    },
    exec,
  )
  assert.equal(fail.overall, 'FAIL')
  assert.equal(state.guards.length, 1, 'guard registered on the agent scope at first execution')
  const guard = state.guards[0]
  const denied = guard({ name: 'bash' })
  assert.equal(typeof denied, 'string')
  assert.ok(denied.includes('completion_gate'), 'denial names the gate')
  assert.ok(denied.includes('FAIL'), 'denial names the failing receipt')
  const deniedStop = guard({ name: 'stop' })
  assert.equal(typeof deniedStop, 'string')
  // unlisted tools are untouched
  assert.equal(guard({ name: 'ls' }), undefined)

  // PASS receipt on the same armed gate -> guard releases
  const pass = await tool.execute(
    { conditions: [{ kind: 'file', path: 'ok.txt', exists: true, nonEmpty: true }] },
    exec,
  )
  assert.equal(pass.overall, 'PASS')
  assert.equal(guard({ name: 'bash' }), undefined)

  // BLOCKED receipts also hold the guard (only PASS releases it)
  const blocked = await tool.execute({ conditionsPath: 'nope.json', arm: { denyTools: ['bash'] } }, exec)
  assert.equal(blocked.overall, 'BLOCKED')
  assert.equal(typeof guard({ name: 'bash' }), 'string')
})

test('arm without denyTools arms the gate without denying anything', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-shell-'))
  fs.writeFileSync(path.join(dir, 'ok.txt'), 'x')
  const { state, tool, mocks } = mountPlugin(dir)
  const fail = await tool.execute(
    {
      conditions: [{ kind: 'file', path: 'ok.txt', exists: true, minBytes: 999 }],
      arm: { denyTools: [] },
    },
    mkExec(mocks),
  )
  assert.equal(fail.overall, 'FAIL')
  assert.equal(state.guards[0]({ name: 'bash' }), undefined)
})

test('output.render emits the receipt as JSON text', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-shell-'))
  const { tool } = mountPlugin(dir)
  const receipt = { overall: 'PASS' }
  const rendered = tool.output.render({}, receipt)
  assert.deepEqual(rendered, [{ type: 'text', text: JSON.stringify(receipt) }])
})