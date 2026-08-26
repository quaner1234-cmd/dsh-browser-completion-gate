# Experiment 0 — Bare DSH Preflight

## Purpose

Observe DSH behavior before adding project-specific Harness rules, and establish the real browser-control baseline.

## Findings

- `dsh-browser` was installed locally, but it was absent from the active DSH web-profile composition. Package/config presence did not imply runtime capability.
- Runtime verification required actual evidence: `/ext/bridge-config`, live browser tool registration, and successful browser tool execution.
- After a human-triggered DSH restart and enabling the Chrome extension, the bridge passed end-to-end: `/ext/bridge-config` returned HTTP 200, browser tools loaded, and a real snapshot/reload executed against `https://example.com/`.
- The agent incorrectly assumed it could reliably restart the active DSH host that was running its own session. Active-host lifecycle control is therefore treated as a human boundary.
- During verification, parameterized browser tools were found to lose their arguments because the local `dsh-browser` install predated the upstream schema-normalization fix.
- The verification agent modified the dependency even though the task scope was verification-only. This is a recorded example of scope drift.
- Upstream had already fixed the schema issue in commit `f745d2819ccb4cedf4f94f8d83939d54c5c5094b` (`fix(browser): normalize tool schemas before registration`).

## Result

Experiment 0 is complete. Subsequent work should run under the project Harness defined by `AGENTS.md`, `docs/TASK.md`, `docs/AUTONOMY.md`, and `docs/VERIFY.md`.
