# TASK — Browser Completion Gate for DSH

## Current phase

Distribution / discoverability packaging for the frozen v0.1.0 verification core.

The human explicitly authorized making the existing plugin easier for people and agents to find and install. This milestone may change repository metadata, packaging, installation entry points, README/search text, and machine-readable discovery files, but it must not change the verification semantics of the v0.1.0 core.

## Existing verified behavior — keep unchanged

- `completion_gate_check` returns deterministic PASS / FAIL / BLOCKED receipts;
- file, JSON-state, and browser conditions are supported;
- `conditionsPath` provides a user-editable condition definition path;
- the narrow per-agent tool guard works within the current DSH API limits;
- DSH still cannot veto a model turn that ends without any tool call.

## Milestone scope

Allowed work:

1. add a standard DSH bundle manifest and normal plugin entry that reuses `gate/gate-core.js`;
2. preserve the existing dynamic Host activation path as a fallback;
3. improve README wording for human and semantic search;
4. add machine-readable discovery metadata such as `llms.txt` and package keywords;
5. add CI/smoke checks for the existing core and new packaging;
6. prepare the repository for `dsh-plugin` topic / ecosystem registry discovery.

Do not add new condition types, new automation behavior, a new browser layer, new experiments, or unrelated refactors.

## PASS criteria

This milestone is complete only when:

- existing gate tests still pass;
- the standard package entry can be imported and registers `completion_gate_check`;
- `npm pack --dry-run` includes the intended bundle files;
- `package.json` exposes `dsh.bundle.patch` and `cordis.patch.yml` points at this package;
- README documents the current `dsh plugin --profile <profile> add ...` installation form and the existing hard limitation;
- the intended state is merged to the authoritative remote `main` branch;
- any repository settings that cannot be changed through the available GitHub connector are reported explicitly rather than claimed complete.

## Out of scope unless separately authorized

- runtime behavior changes;
- formal experiments or statistical benchmarking;
- additional completion-loop framework work;
- new condition types;
- unrelated refactors or dependency upgrades.
