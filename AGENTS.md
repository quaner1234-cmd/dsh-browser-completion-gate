# AGENTS.md

## Project

Build a usable Browser Completion Gate plugin MVP for DSH.

The plugin is the deliverable. Research, benchmarks, and experiments are supporting activities only.

- Reuse dsh-browser for browser control.
- Do NOT build another browser automation framework.
- Keep scope narrow.
- Prefer the smallest verifiable change.
- Default to engineering mode, not research mode.

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
- Do not continue into the next milestone unless `docs/TASK.md` explicitly authorizes it.
