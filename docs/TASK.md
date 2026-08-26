# TASK — Browser Completion Gate for DSH

## Current goal

Build and evaluate whether an explicit external Browser Completion Gate reduces
false-success outcomes compared with agent self-judgment.

## Current phase

Stabilize and freeze dsh-browser before baseline experiments.

## Status (2026-08-26 late)

- Bridge verified end-to-end (VERDICT PASS): browser_* tools registered, parameterized
  calls (navigate/get_text) succeed against the running process; public-page smoke test done.
  Evidence: `POST-RESTART-VERIFICATION.md` (RE-VERIFICATION section).
- dsh-browser frozen at upstream base `a817c300b24cc106ef2c9dd73843a0c18cc568b7` with a
  documented single-file delta (bridge-browser `src/tools.ts`, schema normalization);
  tests 80/80 passing. Upstream official fix `f745d28…` recorded, not applied (freeze scope).
- Next: design three baseline tasks.

## Immediate task

Put dsh-browser into a reproducible upstream state containing the official
tool-schema normalization fix, then verify parameterized browser tools end-to-end.
→ DONE: base commit recorded, delta documented, parameterized tools verified.

## Non-goals

- no browser automation replacement;
- no dsh-browser redesign;
- no unrelated features;
- no Completion Gate implementation yet;
- no unrelated dependency upgrades.

## Next phases

1. freeze browser environment;
2. design three baseline tasks;
3. measure false success / time-to-verified-completion;
4. implement minimum Completion Gate;
5. run controlled comparison.