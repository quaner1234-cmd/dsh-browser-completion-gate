# AGENTS.md

## Project

This project experiments with a deterministic Browser Completion Gate for DSH.

- Reuse dsh-browser for browser control.
- Do NOT build another browser automation framework.
- Keep scope narrow.

## Working principles

- Understand current state before modifying code.
- Prefer existing capabilities and the minimum necessary change.
- Configuration/code presence/agent claims are not proof of success.
- Runtime state, tool execution, tests, diffs, and observable outcomes are evidence.

## Before substantial work

Read `docs/TASK.md`, `docs/AUTONOMY.md`, and `docs/VERIFY.md`.

## Evidence of record

- `POST-RESTART-VERIFICATION.md` — preflight bridge verification report (verdict FAIL, root-caused); preserved from the preflight phase.
- `preflight-backup/` — machine-specific backups of the local DSH web profile config; kept on disk for reference, intentionally not committed (see `.gitignore`).