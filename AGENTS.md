# AGENTS.md

## Project

This project experiments with a deterministic Browser Completion Gate for DSH.

- Reuse dsh-browser for browser control.
- Do NOT build another browser automation framework.
- Keep scope narrow.
- Prefer the smallest verifiable change.

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
