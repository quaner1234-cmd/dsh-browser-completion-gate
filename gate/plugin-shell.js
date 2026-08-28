// gate/plugin-shell.js — SOURCE for the completion Gate dynamic Host plugin.
// Not directly loadable: gate/build-plugin.js embeds gate-core.js at the
// __GATE_CORE__ marker and emits gate/plugin-host.generated.js (the exact
// function body to hand to cordis_define code.host, or to an agent preset).
//
// LEGACY / COMPATIBILITY FALLBACK — the PRIMARY runtime is the standard DSH
// bundle entry `index.mjs` at the repository root (install:
// `dsh plugin --profile <profile> add github:quaner1234-cmd/dsh-browser-completion-gate`).
// This dynamic Host path is kept for debugging and for setups that cannot
// install the bundle; it evaluates the SAME gate/gate-core.js (embedded at
// build time) with identical PASS / FAIL / BLOCKED semantics. Do not treat it
// as the main installation path.
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

    // --- completion-enforcement state --------------------------------------
    //
    // Current DSH cannot veto turn completion (verified against dsh-agent-loop:
    // `turn/end` is appended unconditionally; a turn completes when the model
    // emits a message with no tool calls, or when a tool result concludes the
    // turn). The narrowest practical lever is the tools.guard: while the gate
    // is ARMED and the last receipt is not PASS, calls to the configured
    // completion-relevant tool names are denied with an explicit reason. This
    // never blocks the "model finishes without calling any tool" exit, which
    // is documented as a hard limitation of the contract.
    //
    // The dynamic-plugin sandbox only exposes a restricted `tools` wrapper
    // (register/schemas/get — no guard, no execute), so the REAL tools service
    // is reached through the executing agent's own scoped context
    // (`exec.agent.ctx`), which is what scopes the guard to this one agent.

    let armed = false
    let denyTools = [] // completion-relevant tool names denied until PASS
    let lastOverall = null
    let guardDispose = null

    // The agent-scoped tools service behind one tool execution.
    function agentTools(exec) {
      const agent = exec && exec.agent
      const actx = agent && agent.ctx
      if (!actx || typeof actx.get !== 'function') return undefined
      const tools = actx.get('tools')
      return tools && typeof tools === 'object' ? tools : undefined
    }

    // Register the completion guard on the agent's OWN tools layer on the
    // first execution (apply() has no exec yet). The real tools service is
    // not reachable through the sandbox ctx wrapper; exec.agent.ctx is the
    // agent's real scoped context.
    function ensureGuard(exec) {
      if (guardDispose !== null) return
      const tools = agentTools(exec)
      if (tools && typeof tools.guard === 'function') {
        guardDispose = tools.guard(gateGuard)
      }
    }

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
      // The sandbox's `tools` wrapper has no execute; dispatch through the
      // agent's real tools service so browser checks reuse the existing
      // dsh-browser bridge (no browser automation of our own).
      const tools = agentTools(exec) || ctx.get('tools')
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

    const tool = {
      name: 'completion_gate_check',
      description:
        'Deterministically verify explicit completion conditions and return a machine-readable verification receipt (overall PASS | FAIL | BLOCKED) with per-check expected and observed evidence. Conditions are given inline as "conditions" or read from a JSON file via "conditionsPath" (a JSON array of condition objects; relative paths resolve against the caller cwd). Supported condition kinds: "file" (exists, nonEmpty, minBytes, sha256 of a file), "json_state" (read a JSON state file, select a value by JSON pointer or segment array with { find: {...} } for exact targets, compare with expect via eq|ne), and "browser" (url_matches, visible_text_contains, selector_text — evaluated through the existing dsh-browser bridge). Optional "arm": { denyTools: ["name", ...] } arms the completion guard for this session — until this tool returns overall PASS, calls to the named tools are denied with an explicit reason (note: DSH cannot veto a turn that ends without any tool call; the guard is the narrowest available enforcement and cannot block that exit). Never an LLM judge; a check that cannot be evaluated is BLOCKED, never silently successful.',
      parameters: {
        type: 'object',
        properties: {
          conditions: {
            type: 'array',
            description:
              'Declarative conditions to evaluate. Each item: { id?, kind: "file"|"json_state"|"browser", ...kind-specific fields }. Exactly one of this or conditionsPath must be given. See gate/README.md for the exact schema and examples.',
          },
          conditionsPath: {
            type: 'string',
            description:
              'Path to a JSON file containing the conditions array (relative paths inside it resolve against the caller cwd). The user-editable way to define completion conditions. Exactly one of this or conditions must be given.',
          },
          context: {
            description: 'Optional caller context echoed verbatim in the receipt (e.g. { trial: "t3-01" }).',
          },
          arm: {
            description:
              'Optional enforcement: { denyTools: [toolName, ...] }. Arms the completion guard for this session with that deny list; while the last receipt is not PASS, calls to those tools are denied. Pass an empty array to arm without denying anything.',
          },
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
        // Enforcement state: every evaluation refreshes the last receipt; a
        // call that carries `arm` (re)arms the guard with its deny list.
        lastOverall = receipt.overall
        if (args.arm !== undefined) {
          armed = true
          denyTools = Array.isArray(args.arm && args.arm.denyTools)
            ? args.arm.denyTools.filter((s) => typeof s === 'string')
            : []
        }
        return receipt
      },
    }

    // --- completion guard ---------------------------------------------------
    // tools.guard is the narrowest completion-enforcement lever current DSH
    // offers: a synchronous per-call denial. It only vetoes tool calls — the
    // "model stops without any tool call" completion exit cannot be vetoed by
    // any current DSH API, and that limitation is documented in gate/README.md.

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

    // The agent-scoped guard is registered lazily on first execution and must
    // be removed when this plugin stops; ctx.effect owns that disposal.
    ctx.effect(() => () => {
      if (guardDispose !== null) {
        try {
          guardDispose()
        } catch (e) {
          // disposal must never break plugin teardown
        }
        guardDispose = null
      }
    })

    return harness.registerTool(ctx, harness.defineTool(tool))
  },
}