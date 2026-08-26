// gate/plugin-shell.js — SOURCE for the minimum Completion Gate dynamic Host
// plugin. Not directly loadable: gate/build-plugin.js embeds gate-core.js at
// the __GATE_CORE__ marker and emits gate/plugin-host.generated.js (the exact
// function body to hand to cordis_define code.host, or to an agent preset).
//
// The plugin registers one tool, `completion_gate_check`, which evaluates a
// declarative list of completion conditions against injected probes and
// returns a machine-readable verification receipt (PASS / FAIL / BLOCKED with
// per-check expected+observed evidence). Nothing here is an LLM judge; nothing
// here can pass silently.
return {
  apply(ctx) {
    const core = __GATE_CORE__
    const MAX_BYTES = 16 * 1024 * 1024

    function randomId(prefix) {
      const chars = '0123456789abcdef'
      let s = ''
      for (let i = 0; i < 16; i++) s += chars[Math.floor(Math.random() * 16)]
      return prefix + s
    }

    // --- probes -----------------------------------------------------------

    function agentCwd(exec) {
      const agent = exec && exec.agent
      const header = agent && agent.session && agent.session.header
      return header && typeof header.cwd === 'string' ? header.cwd : undefined
    }

    // Dispatch one existing native tool (dsh-browser bridge tools) from inside
    // the gate: reuses dsh-browser, builds no browser automation of our own.
    async function dispatchBrowser(tools, exec, name, args) {
      if (!tools || typeof tools.execute !== 'function') {
        throw new Error('tools service unavailable')
      }
      const result = await tools.execute({
        callId: randomId('call-'),
        name,
        arguments: args,
        signal: exec.signal,
        agent: exec.agent,
      })
      if (!result) throw new Error(name + ' returned no result')
      if (result.isError) {
        const err = result.error || {}
        throw new Error(
          name + ' dispatch failed: ' + String(err.message || err.code || 'unknown'),
        )
      }
      const value = result.value
      if (value && typeof value === 'object' && typeof value.text === 'string') {
        return value.text
      }
      throw new Error(name + ' returned no usable text')
    }

    // Parse the dsh-browser text snapshot (Chinese labels, current bridge
    // format) into { url, visibleText, raw }. Deliberately conservative: any
    // parse mismatch surfaces as missing evidence (empty fields), never as a
    // silent pass — conditions still FAIL/BLOCK.
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
      const fs = ctx.get('fs')
      const tools = ctx.get('tools')
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
          } catch (e) {
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

    // --- tool -------------------------------------------------------------

    const checkSchema = {
      type: 'object',
      additionalProperties: false,
      properties: {
        id: { type: 'string' },
        kind: { type: 'string', required: true },
        path: { type: 'string' },
        exists: { type: 'boolean' },
        nonEmpty: { type: 'boolean' },
        minBytes: { type: 'number' },
        sha256: { type: 'string' },
        select: { type: 'json' },
        expect: { type: 'json' },
        op: { type: 'string' },
        check: { type: 'string' },
        pattern: { type: 'string' },
        text: { type: 'string' },
        selector: { type: 'string' },
      },
    }

    const tool = {
      name: 'completion_gate_check',
      description:
        'Deterministically verify explicit completion conditions and return a machine-readable verification receipt (overall PASS | FAIL | BLOCKED) with per-check expected and observed evidence. Supported condition kinds: "file" (exists, nonEmpty, minBytes, sha256 of a file), "json_state" (read a JSON state file, select a value by JSON pointer or segment array with { find: {...} } for exact targets, compare with expect via eq|ne), and "browser" (url_matches, visible_text_contains, selector_text — evaluated through the existing dsh-browser bridge). Never an LLM judge; a check that cannot be evaluated is BLOCKED, never silently successful.',
      parameters: {
        type: 'object',
        properties: {
          conditions: {
            type: 'array',
            description:
              'Declarative conditions to evaluate. Each item: { id?, kind: "file"|"json_state"|"browser", ...kind-specific fields }. See gate/README.md for the exact schema and the three-task mappings.',
          },
          context: {
            type: 'json',
            description: 'Optional caller context echoed verbatim in the receipt (e.g. { trial: "t3-01" }).',
          },
        },
        required: ['conditions'],
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
        const receipt = await core.evaluateGate(
          {
            conditions: args.conditions,
            context: args.context === undefined ? null : args.context,
            base: '',
          },
          makeProbes(exec),
        )
        return receipt
      },
    }

    return harness.registerTool(ctx, harness.defineTool(tool))
  },
}