import gateCore from './gate/gate-core.js'
import { defineTool } from '@deepseek-ai/dsh-tools'

export const name = 'browser-completion-gate'
export const inject = ['tools']

export function apply(ctx) {
  const core = gateCore
  const MAX_BYTES = 16 * 1024 * 1024

  let armed = false
  let denyTools = []
  let lastOverall = null
  let guardDispose = null

  function agentTools(exec) {
    const agent = exec && exec.agent
    const actx = agent && agent.ctx
    if (!actx || typeof actx.get !== 'function') return undefined
    const tools = actx.get('tools')
    return tools && typeof tools === 'object' ? tools : undefined
  }

  function ensureGuard(exec) {
    if (guardDispose !== null) return
    const tools = agentTools(exec)
    if (tools && typeof tools.guard === 'function') guardDispose = tools.guard(gateGuard)
  }

  function randomId(prefix) {
    const chars = '0123456789abcdef'
    let s = ''
    for (let i = 0; i < 16; i++) s += chars[Math.floor(Math.random() * 16)]
    return prefix + s
  }

  function agentCwd(exec) {
    const agent = exec && exec.agent
    const header = agent && agent.session && agent.session.header
    return header && typeof header.cwd === 'string' ? header.cwd : undefined
  }

  async function dispatchBrowser(tools, exec, toolName, args) {
    if (!tools || typeof tools.execute !== 'function') throw new Error('tools service unavailable')
    const result = await tools.execute({
      callId: randomId('call-'),
      name: toolName,
      arguments: args,
      signal: exec.signal,
      agent: exec.agent,
    })
    if (!result) throw new Error(toolName + ' returned no result')
    if (result.isError) {
      const err = result.error || {}
      throw new Error(toolName + ' dispatch failed: ' + String(err.message || err.code || 'unknown'))
    }
    const value = result.value
    if (value && typeof value === 'object' && typeof value.text === 'string') return value.text
    throw new Error(toolName + ' returned no usable text')
  }

  function parseSnapshot(text) {
    const urlMatch = /^URL:\s*(.*)$/m.exec(text)
    const url = urlMatch ? urlMatch[1].trim() : ''
    let visibleText = ''
    const bodyIdx = text.indexOf('正文:')
    if (bodyIdx !== -1) {
      let rest = text.slice(bodyIdx + '正文:'.length)
      const cut = rest.search(/\n{2,}(交互元素|表单字段)/)
      if (cut !== -1) rest = rest.slice(0, cut)
      visibleText = rest.trim()
    }
    return { url, visibleText, raw: text.slice(0, 2000) }
  }

  function makeProbes(exec) {
    const fs = typeof ctx.get === 'function' ? ctx.get('fs') : undefined
    const tools = agentTools(exec) || ctx.tools
    const cwd = agentCwd(exec)
    return {
      async readFile(path) {
        if (!fs) throw new Error('fs service unavailable')
        const target = await fs.resolve(path, { cwd })
        const info = await fs.stat(target, exec.signal)
        if (!info) return { exists: false, size: null }
        let bytes = null
        try {
          bytes = await fs.readBytes(target, exec.signal, MAX_BYTES)
        } catch {
          bytes = null
        }
        return {
          exists: true,
          size: typeof info.size === 'number' ? info.size : (bytes ? bytes.length : null),
          bytes,
        }
      },
      async readText(path) {
        if (!fs) throw new Error('fs service unavailable')
        const target = await fs.resolve(path, { cwd })
        return fs.readText(target, exec.signal)
      },
      async browserProbe() {
        const text = await dispatchBrowser(tools, exec, 'browser_snapshot', {})
        return parseSnapshot(text)
      },
      async browserSelector(selector) {
        const text = await dispatchBrowser(tools, exec, 'browser_get_text', { selector })
        return { text }
      },
    }
  }

  const tool = defineTool({
    name: 'completion_gate_check',
    description:
      'Deterministically verify explicit completion conditions and return a machine-readable verification receipt (overall PASS | FAIL | BLOCKED) with per-check expected and observed evidence. Use this before trusting an agent completion claim. Supports file, JSON-state, and browser checks through the existing dsh-browser bridge. Never an LLM judge; a check that cannot be evaluated is BLOCKED, never silently successful.',
    parameters: {
      conditions: {
        type: 'array',
        items: { type: 'json' },
        description:
          'Declarative completion conditions. Exactly one of conditions or conditionsPath must be supplied. See gate/README.md for the exact condition schema.',
      },
      conditionsPath: {
        type: 'string',
        description:
          'Path to a JSON file containing the conditions array. Relative paths resolve against the caller workspace cwd. Exactly one of conditions or conditionsPath must be supplied.',
      },
      context: {
        type: 'json',
        description: 'Optional caller context echoed verbatim in the receipt.',
      },
      arm: {
        type: 'object',
        additionalProperties: false,
        properties: {
          denyTools: {
            type: 'array',
            items: { type: 'string' },
            description: 'Tool names denied until the latest gate receipt is PASS.',
          },
        },
        description:
          'Optional per-agent completion guard. Current DSH cannot veto a model turn that ends with no tool call; this is the narrowest available enforcement.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          gate: { type: 'string', required: true },
          version: { type: 'string', required: true },
          overall: { type: 'string', required: true },
          generated_at: { type: 'string', required: true },
          millis: { type: 'number' },
          context: { type: 'json' },
          request_error: { type: 'json' },
          checks: {
            type: 'array',
            required: true,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                id: { type: 'string', required: true },
                kind: { type: 'string', required: true },
                passed: { type: 'json', required: true },
                blocked: { type: 'boolean', required: true },
                reason: { type: 'json' },
                expected: { type: 'string', required: true },
                observed: { type: 'string', required: true },
                error: { type: 'json' },
              },
            },
          },
        },
      },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    async execute(args, exec) {
      ensureGuard(exec)
      const receipt = await core.evaluateGate(
        {
          conditions: args.conditions,
          conditionsPath: args.conditionsPath,
          context: args.context === undefined ? null : args.context,
          base: '',
        },
        makeProbes(exec),
      )
      lastOverall = receipt.overall
      if (args.arm !== undefined) {
        armed = true
        denyTools = Array.isArray(args.arm && args.arm.denyTools)
          ? args.arm.denyTools.filter((s) => typeof s === 'string')
          : []
      }
      return receipt
    },
  })

  function gateGuard(exec) {
    if (!armed || lastOverall === 'PASS') return undefined
    if (exec && denyTools.indexOf(exec.name) !== -1) {
      return (
        'completion_gate: tool "' + exec.name + '" is denied until completion_gate_check ' +
        'returns overall PASS (last receipt: ' + String(lastOverall) + '); run the gate check first'
      )
    }
    return undefined
  }

  if (typeof ctx.effect === 'function') {
    ctx.effect(() => () => {
      if (guardDispose !== null) {
        try {
          guardDispose()
        } catch {
          // disposal must never break plugin teardown
        }
        guardDispose = null
      }
    })
  }

  return ctx.tools.register(tool)
}
