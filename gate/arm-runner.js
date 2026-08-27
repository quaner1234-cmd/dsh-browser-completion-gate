// gate/arm-runner.js — SOURCE for the Gate-arm interceptor Host plugin.
//
// The deployment's one-shot `run_blinded_trial` tool (used for the BASELINE
// arm) was a process-registered ephemeral tool: it disappeared after a DSH
// process restart (2026-08-27 20:46, launcher pid 876) and, more importantly,
// its children were ONE-SHOT (`send_message` → NOT_RESUMABLE), which cannot
// support the Gate arm's repair rounds (docs/GATE-DESIGN.md: "Return only a
// narrow deterministic failure receipt to the SAME tested-agent session, then
// let it continue").
//
// This plugin therefore implements the Gate arm's trial runner itself, using
// only Host services:
//
//   - `ctx.agents.create(...)` — fresh isolated child agent on a neutral
//     workspace (meta.cwd = run_dir), browser_* tools ONLY (setup →
//     `tools.restrict({ allow: [...] })`), approval never (session
//     `approval/policy` append, same as subagent delegation), no parent
//     history seed, delegationDepth 1.
//   - `agent.followup(...)` — deliver the exact task prompt (first turn) and,
//     on later calls, the narrow Gate receipt to the SAME child session.
//   - `agent.whenIdle()` — wait for the child to settle after each turn.
//   - `session.events` — extract the final assistant text, tool-call counts,
//     stop reason and token usage (same fields the baseline records carry).
//
// Tool surface exposed to the orchestrator (this session):
//
//   gate_trial_run   { trial_id, task_id, prompt, run_dir }
//                    → spawn fresh child, deliver prompt, wait settle,
//                      return { ok, trial_id, task_id, session_id, cwd,
//                               stop_reason, final_output, browser_tool_calls,
//                               total_tool_calls, tokens }
//   gate_trial_receipt { session_id, receipt }
//                    → deliver the narrow Gate receipt to the SAME session,
//                      wait for the next settle, return the same record shape.
//   gate_trial_stop  { session_id }
//                    → dispose the child handle (trial end / cleanup).
//
// The tested agent's surface stays EXACTLY the 11 browser_* tools; the task
// prompt stays the fixed `tasks/task-*.md` wording. The interceptor runs
// outside the tested agent: nothing here is injected into the child beyond
// the prompt/receipt user messages.
//
// Build/verify: this file is the human-readable source. The live plugin is
// registered via cordis_define with this body as code.host; the generated
// paste of the same body is committed to gate/arm-runner.generated.js by
// cordis_define itself.

return {
  apply(ctx) {
    const BROWSER_TOOLS = [
      'browser_snapshot', 'browser_click', 'browser_type', 'browser_press',
      'browser_scroll', 'browser_navigate', 'browser_back', 'browser_forward',
      'browser_reload', 'browser_get_text', 'browser_wait',
    ]

    function randomHex(n) {
      const chars = '0123456789abcdef'
      let s = ''
      for (let i = 0; i < n; i++) s += chars[Math.floor(Math.random() * 16)]
      return s
    }

    function sessionIdOf() {
      return 'session-' + randomHex(32)
    }

    function messageIdOf() {
      return 'msg-' + randomHex(16)
    }

    function userMessage(text) {
      return {
        id: messageIdOf(),
        role: 'user',
        content: [{ type: 'text', text }],
        source: { kind: 'user' },
      }
    }

    // --- child creation (mirrors subagent delegation setup) ---------------

    async function createTrialChild(parent, runDir, signal) {
      const agents = ctx.get('agents')
      if (!agents || typeof agents.create !== 'function') {
        throw new Error('agents service unavailable')
      }
      const meta = {
        cwd: runDir,
        parentSession: parent.session.header && parent.session.header.id
          ? parent.session.header.id
          : parent.id,
        origin: 'subagent',
        delegationDepth: 1,
      }
      const agentOptions = {}
      const po = parent && parent.options
      if (po) {
        if (po.provider !== undefined) agentOptions.provider = po.provider
        if (po.model !== undefined) agentOptions.model = po.model
      }
      const handle = await agents.create({
        sessionId: sessionIdOf(),
        meta,
        agentOptions,
        signal,
        setup(childCtx) {
          // Join the parent's agent preset (tools + prompt sections), then
          // restrict to the browser surface — exactly what run_blinded_trial
          // did for the baseline children.
          try {
            const presets = childCtx.get('agentPresets')
            if (presets && typeof presets.composeFrom === 'function') {
              presets.composeFrom(childCtx, parent.ctx)
            }
          } catch (e) {
            console.log('arm-runner: preset compose skipped: ' + e.message)
          }
          try {
            childCtx.tools.restrict({ allow: BROWSER_TOOLS })
          } catch (e) {
            console.log('arm-runner: tool restrict failed: ' + e.message)
            throw e
          }
          // Approval policy pin: same as subagent delegation (never).
          // NOTE: do NOT use approval.setPolicy() here — it injects a
          // "policy changed" user message into the child (visible to the
          // tested agent), which would leak orchestrator context. Replicate
          // appendDelegatedPolicyOverrides instead: append the policy event
          // directly to the session log.
          try {
            childCtx.agent.session.append('approval/policy', {
              policy: 'never',
              source: 'delegation',
            })
          } catch (e) {
            console.log('arm-runner: approval append failed: ' + e.message)
            throw e
          }
        },
      })
      return handle
    }

    // --- final-output extraction from the child's session events ----------

    function readTrialOutcome(agent) {
      const events = agent.session.events
      let lastAssistantText = null
      let browserToolCalls = 0
      let totalToolCalls = 0
      let stopReason = 'completed'
      const tokens = { input: 0, output: 0, cache_read: 0, cache_write: 0 }
      for (const ev of events) {
        const d = ev.data
        if (!d) continue
        if (ev.type === 'assistant/message') {
          const blocks = d.message && d.message.content
          if (Array.isArray(blocks)) {
            const text = blocks
              .filter((b) => b && b.type === 'text' && typeof b.text === 'string')
              .map((b) => b.text)
              .join('')
            if (text !== '') lastAssistantText = text
          }
          const u = d.usage
          if (u) {
            if (typeof u.input === 'number') tokens.input += u.input
            if (typeof u.output === 'number') tokens.output += u.output
            if (typeof u.cache_read === 'number') tokens.cache_read += u.cache_read
            if (typeof u.cache_write === 'number') tokens.cache_write += u.cache_write
          }
        } else if (ev.type === 'tool/call') {
          totalToolCalls++
          if (typeof d.name === 'string' && d.name.startsWith('browser_')) {
            browserToolCalls++
          }
        } else if (ev.type === 'turn/end') {
          if (typeof d.reason === 'string') stopReason = d.reason
        }
      }
      return {
        final_output: lastAssistantText,
        browser_tool_calls: browserToolCalls,
        total_tool_calls: totalToolCalls,
        stop_reason: stopReason,
        tokens,
      }
    }

    // --- tool definitions --------------------------------------------------

    const runTool = {
      name: 'gate_trial_run',
      description:
        'Run one Gate-arm blinded trial turn: spawn a fresh isolated child agent (neutral workspace = run_dir, the 11 browser_* tools ONLY, approval never, no parent history), deliver the exact task prompt, wait for the child to settle, and return its final output and telemetry. Experiment orchestration only (Gate arm).',
      parameters: {
        type: 'object',
        properties: {
          trial_id: { type: 'string', description: 'Trial label, e.g. t1-01' },
          task_id: { type: 'string', description: 'task-1 | task-2 | task-3' },
          prompt: { type: 'string', description: 'Exact user-facing task prompt to deliver verbatim' },
          run_dir: { type: 'string', description: 'Absolute path of the fresh neutral runner directory for this trial' },
        },
        required: ['trial_id', 'task_id', 'prompt', 'run_dir'],
      },
      async execute(args, exec) {
        const handle = await createTrialChild(exec.agent, args.run_dir, exec.signal)
        const agent = handle.agent
        agent.followup(userMessage(args.prompt))
        await agent.whenIdle()
        const outcome = readTrialOutcome(agent)
        return {
          ok: true,
          trial_id: args.trial_id,
          task_id: args.task_id,
          session_id: agent.id,
          cwd: args.run_dir,
          stop_reason: outcome.stop_reason,
          final_output: outcome.final_output,
          browser_tool_calls: outcome.browser_tool_calls,
          total_tool_calls: outcome.total_tool_calls,
          tokens: outcome.tokens,
        }
      },
    }

    const receiptTool = {
      name: 'gate_trial_receipt',
      description:
        'Deliver a narrow deterministic Gate failure receipt to the SAME tested-agent session (created by gate_trial_run) as an ordinary user message, wait for the next settle, and return the child final output and telemetry. Used for the bounded repair loop (max 3 Gate checks per trial).',
      parameters: {
        type: 'object',
        properties: {
          session_id: { type: 'string', description: 'Durable child session id returned by gate_trial_run' },
          receipt: { type: 'string', description: 'Narrow failure receipt text (the exact COMPLETION CHECK FAILED block)' },
        },
        required: ['session_id', 'receipt'],
      },
      async execute(args, exec) {
        const agents = ctx.get('agents')
        const agent = agents && typeof agents.get === 'function' ? agents.get(args.session_id) : undefined
        if (!agent) {
          throw new Error('gate_trial_receipt: no live child session ' + args.session_id)
        }
        agent.followup(userMessage(args.receipt))
        await agent.whenIdle()
        const outcome = readTrialOutcome(agent)
        return {
          ok: true,
          session_id: agent.id,
          stop_reason: outcome.stop_reason,
          final_output: outcome.final_output,
          browser_tool_calls: outcome.browser_tool_calls,
          total_tool_calls: outcome.total_tool_calls,
          tokens: outcome.tokens,
        }
      },
    }

    const stopTool = {
      name: 'gate_trial_stop',
      description:
        'Dispose a Gate-arm trial child session (created by gate_trial_run) and release its resources. End-of-trial cleanup.',
      parameters: {
        type: 'object',
        properties: {
          session_id: { type: 'string', description: 'Durable child session id returned by gate_trial_run' },
        },
        required: ['session_id'],
      },
      async execute(args) {
        const agents = ctx.get('agents')
        const agent = agents && typeof agents.get === 'function' ? agents.get(args.session_id) : undefined
        if (!agent) return { ok: true, disposed: false }
        await agent.cancel({ kind: 'parent' })
        return { ok: true, disposed: true }
      },
    }

    return [
      harness.registerTool(ctx, harness.defineTool(runTool)),
      harness.registerTool(ctx, harness.defineTool(receiptTool)),
      harness.registerTool(ctx, harness.defineTool(stopTool)),
    ]
  },
}