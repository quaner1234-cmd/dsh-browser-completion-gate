# AGENTS.md

## Project

Build a usable Browser Completion Gate plugin MVP for DSH.

The plugin is the deliverable. Research, benchmarks, and experiments are supporting activities only.

- Reuse dsh-browser for browser control.
- Do NOT build another browser automation framework.
- Keep scope narrow.
- Prefer the smallest verifiable change.
- Default to engineering mode, not research mode.

## Product paths

- Primary runtime: `index.mjs` (standard DSH bundle entry) +
  `gate/gate-core.js` (frozen v0.1.0 verification core). Install:
  `dsh plugin --profile <profile> add github:quaner1234-cmd/dsh-browser-completion-gate`.
- `gate/plugin-shell.js` / `gate/build-plugin.js` /
  `gate/plugin-host.generated.js` are the LEGACY dynamic-Host compatibility
  path — kept, not primary, not to be extended or treated as the default.
- Do not change the verification semantics in `gate/gate-core.js`
  (PASS / FAIL / BLOCKED rules are frozen v0.1.0 contract): unreliably
  checkable → BLOCKED, definitively unmet → FAIL, all met → PASS, empty
  conditions never PASS, unknown kind never PASS, probe error never PASS.

## Project-level stopping / escalation rule

Use only the minimum evidence needed to decide the next engineering step.

Do not introduce formal A/B experiments, statistical benchmarking, additional experiment infrastructure, or research-grade controls unless one of these is true:

1. they are required to unblock a usable plugin MVP; or
2. the human explicitly switches the project into research mode.

If a real failure mode has already been reproduced and the proposed fix passes a direct regression/smoke check, continue building the plugin instead of increasing experimental rigor.

## Active instruction map

For substantial work, read only:

1. `docs/TASK.md` — the current milestone and stop condition.
2. `docs/AUTONOMY.md` — what may be done autonomously and what requires a Human Gate.
3. `docs/VERIFY.md` — what counts as evidence and PASS.

Read other design/runbook/history documents only when `docs/TASK.md` explicitly points to them.
Historical experiment documents are evidence, not active instructions.

## Working principles

- Understand current state before modifying code.
- Prefer existing capabilities over new architecture.
- Configuration, code presence, and agent claims are not proof of success.
- Runtime state, tool execution, tests, diffs, and observable outcomes are evidence.
- An agent's own "done" report is never verification (`docs/VERIFY.md`).
- After changing browser-adapter code (`dispatchBrowser()` / `parseSnapshot()` /
  `makeProbes()`), a real DSH + dsh-browser smoke test is required; unit tests
  with fake browser probes alone do not prove the live path.
- Never delete, skip, or relax tests (or fixture checks) to make CI green —
  report the failing condition instead.
- Do not continue into the next milestone unless `docs/TASK.md` explicitly authorizes it.
