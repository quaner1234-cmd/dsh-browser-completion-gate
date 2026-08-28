# TASK — Browser Completion Gate for DSH

## Current phase

MVP frozen — v0.1.0 release candidate.

Clean-session acceptance passed and is recorded in `docs/ACCEPTANCE-clean-session.md`.

The plugin is usable now:

- `completion_gate_check` returns deterministic PASS / FAIL / BLOCKED receipts;
- file, JSON-state, and browser conditions are supported;
- `conditionsPath` provides a user-editable condition definition path;
- the narrow per-agent tool guard works within the current DSH API limits;
- the README documents activation, examples, and the hard limitation that DSH cannot veto a model turn that ends without any tool call.

## Status

Development is complete for v0.1.0.

No active engineering or experiment milestone remains.

## Release hygiene only

Allowed repository-only actions:

1. fast-forward the accepted working branch into `main`;
2. create a `v0.1.0` tag/release;
3. preserve `prototype/minimum-completion-gate` as historical development evidence if useful.

Do not change plugin behavior during release hygiene.

## Not authorized unless the human explicitly starts a new milestone

- no formal experiments;
- no Baseline/Gate trial collection;
- no dedicated-profile or dual-session testing;
- no statistical benchmarking;
- no new completion-loop framework;
- no new condition types;
- no unrelated refactors or dependency upgrades;
- no feature expansion.

If no explicit new milestone is given, remain frozen at v0.1.0 candidate.
