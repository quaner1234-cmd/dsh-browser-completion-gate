# Gate arm — execution environment notes & recovery steps

Status: formal Gate-arm collection **PAUSED** pending a dedicated browser
execution environment (human-provided). No browser tooling is being operated
by the orchestrator until that environment exists and is verified.

## Environment facts discovered during calibration (2026-08-27)

### 1. `run_blinded_trial` is process-ephemeral and is now unavailable

- At 07:32 (+08) the deployment tool `run_blinded_trial` ran one successful
  calibration trial (`calib-wiring`, task-3 empty; session
  `session-3389a5e5a9c0e4f86eba4ba0ddce5452`), returning the runner contract
  observed in `results/baseline.jsonl` (final output, browser/total tool
  calls, tokens, session id, cwd).
- DSH web restarted 20:46:02 (launcher pid 876; previous pid 6515). After the
  restart `run_blinded_trial` is no longer registered in `Tool.listTools` and
  a direct call fails with `unknown tool`. Its source is not present in the
  installed npm packages or profile patches; it was injected at runtime by
  the old process only.
- Additionally, `run_blinded_trial` children were ONE-SHOT: `send_message`
  → `NOT_RESUMABLE` ("has no supported continuation state"). That cannot
  satisfy `docs/GATE-DESIGN.md` step 6 (narrow receipt to the SAME tested
  agent session, then continue). The deployment tool was therefore unusable
  for the Gate arm even before it disappeared.

### 2. Interceptor implemented as a Host plugin (mechanism FROZEN)

`gate/arm-runner.js` (source) + live cordis plugin `gtrun-2/pkg-2` (running,
Host half only) implement the Gate arm runner on the same services the
deployment tool used:

- `ctx.agents.create` with `meta.cwd = run_dir` (neutral workspace), origin
  `subagent`, delegationDepth 1, no parent-history seed;
- `setup` joins the parent agent preset then `tools.restrict({ allow:
  BROWSER_TOOLS })` — the tested agent surface stays the 11 browser_* tools;
- approval pinned `never` via a direct `approval/policy` session append
  (NOT `approval.setPolicy`, which would inject a visible "policy changed"
  user message into the child);
- tools: `gate_trial_run` (spawn + deliver prompt + wait settle),
  `gate_trial_receipt` (deliver narrow receipt to the SAME session + wait),
  `gate_trial_stop` (cleanup);
- final output/tool-call counts/stop reason are read from the child session
  event log (`assistant/message`, `tool/call`, `turn/end`).

Calibration `calib-int` (07:32-era tool run) then `calib-int2` with the
plugin (task-3 empty) proved: child claims completion → `gate/check.js` FAIL
→ receipt → child keeps working → child reports NOT complete. The
interception loop works end-to-end. These are calibration, not formal
trials.

## 3. CRITICAL: browser binding leaks the experiment to the tested agent

`calib-int2` repair round (150 browser calls) produced a child report that
contained:

- "fixture was explicitly reset to `task-3 empty` mode for this trial";
- a workspace file browser view listing `fixtures/state/downloads/...`;
- the parent session title and its log;
- "the bridge is currently bound to the harness GUI tab".

Root cause: dsh-browser binds browser control to the ACTIVE / user-selected
tab. During the repair round the active tab was the DSH Web GUI
(`127.0.0.1:3080`), so the tested agent's browser snapshots read the GUI —
including repository file tree, fixture mode, and parent session log. This is
an experiment-design leak of exactly the kind `docs/BASELINE-RUNBOOK.md`
forbids, and it means the observer window and the execution window were NOT
actually separated after the process restart.

Baseline trials passed because a stable dedicated execution window existed.
After the restart that separation was lost; the orchestrator must NOT assume
`browser_snapshot` returning the fixture page implies the binding will stay
there while the human uses the GUI.

## Formal Gate arm — required execution premise

The orchestrator will resume collection ONLY after a human provides a
dedicated browser execution environment that the human does NOT use for any
other purpose, e.g. a separate Chrome profile with the dsh browser assistant
extension, holding only the fixture tab (`http://127.0.0.1:4017/<page>`).

Resume checklist (per trial, before any prompt is delivered):

1. Human confirms the dedicated execution environment is ready and unused by
   anyone else.
2. Orchestrator verifies binding WITHOUT navigating the user's windows:
   - read-only `osascript` window/tab listing shows the dedicated window on
     the fixture page and no other window is active;
   - one `browser_snapshot` confirms URL = `http://127.0.0.1:4017/<task page>`.
3. If binding is NOT the fixture tab, mark the trial infrastructure-invalid
   and do not proceed; repeat the same task/mode after re-binding in the
   dedicated environment only.
4. Run the trial with the frozen interceptor (`gate_trial_run` /
   `gate_trial_receipt` / `gate/check.js`), record `results/gate.jsonl`.
5. If the child's repair-round output ever reports GUI/observer content,
   halt collection and report the leak (infrastructure-invalid).

## Frozen artifacts (no browser needed to keep these safe)

- `docs/GATE-DESIGN.md` (from origin/main, merged)
- `docs/GATE-RUNBOOK.md` — pre-registered condition sets, schedule, receipts,
  metrics schema, stop conditions
- `gate/check.js` — independent deterministic Gate checker (12/12 agreement
  vs `fixtures/grader.js`, `results/gate-checker-agreement.md`)
- `gate/arm-runner.js` + live `gtrun-2/pkg-2` — interceptor runner
- pending: `results/gate.jsonl` + `results/gate.md` (empty until collection)