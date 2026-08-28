# TASK — Browser Completion Gate for DSH

## Current phase

Distribution / discoverability packaging is complete for the frozen v0.1.0 verification core.

The standard bundle packaging, direct GitHub install path, search-oriented README copy, machine-readable discovery metadata, and CI verification are merged to `main`. The verification semantics of the v0.1.0 core were not changed.

Two repository-level discovery settings remain outside the available GitHub connector and require owner action in the GitHub UI:

1. improve the repository **Description**;
2. add GitHub **Topics**, especially `dsh-plugin`.

Those settings are intentionally recorded as external follow-up rather than silently treated as complete.

## Existing verified behavior — keep unchanged

- `completion_gate_check` returns deterministic PASS / FAIL / BLOCKED receipts;
- file, JSON-state, and browser conditions are supported;
- `conditionsPath` provides a user-editable condition definition path;
- the narrow per-agent tool guard works within the current DSH API limits;
- DSH still cannot veto a model turn that ends without any tool call.

## Repository hygiene pass (2026-08-28) — cleanup only, no behavior change

- `index.mjs` (standard DSH bundle entry) confirmed as the **primary runtime**;
  the dynamic Host path (`gate/plugin-shell.js` / `build-plugin.js` /
  `plugin-host.generated.js`) is documented everywhere as
  **legacy / compatibility fallback** (root README, `gate/README.md`, code
  headers) and remains in place, not removed.
- Repository structure mapped in the root README (Runtime / Legacy
  compatibility / Tests / Historical experiments / Agent instructions);
  experiment-era files were NOT moved (references are pervasive and the
  records are cross-linked); nothing was deleted.
- Agent instructions updated (AGENTS.md, docs/VERIFY.md): an agent's own
  "done" is not verification; browser-adapter changes require a live
  DSH + dsh-browser smoke test (fake-browser suites cannot prove the live
  path); tests must never be deleted/skipped/relaxed to make CI green.
- Known risks recorded (root README + `gate/README.md`): `parseSnapshot()`
  depends on the dsh-browser text-snapshot labels (not a stable API; fails
  closed); `index.mjs` ↔ `gate/plugin-shell.js` duplication is deliberate
  technical debt, not refactored.
- Verified: full test suite green, `index.mjs` registers
  `completion_gate_check`, `npm pack --dry-run` OK. No runtime behavior
  changed; `gate/gate-core.js` untouched.

## Completed milestone

- standard DSH bundle manifest added;
- normal plugin entry reuses `gate/gate-core.js`;
- existing dynamic Host activation path preserved as fallback;
- README rewritten for human and semantic search;
- `llms.txt` and package keywords added for machine-readable discovery;
- CI verifies the full existing gate test suite, standard entry registration, bundle metadata, and packed payload;
- direct GitHub install form documented.

## Verification evidence

The authoritative `main` CI run after merge passed all checks, including:

- full existing Completion Gate test suite;
- standard DSH plugin entry registration of `completion_gate_check`;
- `dsh.bundle` / `cordis.patch.yml` metadata checks;
- `npm pack --dry-run`.

## External follow-up

Recommended GitHub Description:

> Deterministic proof-of-completion for DeepSeek Harness browser agents. Verify browser state, files and JSON before trusting an agent's done message.

Recommended Topics:

- `dsh-plugin`
- `deepseek-harness`
- `dsh`
- `browser-agent`
- `agent-verification`
- `completion-gate`
- `harness-engineering`

Once the `dsh-plugin` topic is present, GitHub-topic-driven community discovery/marketplace indexers can discover the repository automatically; curated registries may still require their own review or submission process.

## Out of scope unless separately authorized

- runtime behavior changes;
- formal experiments or statistical benchmarking;
- additional completion-loop framework work;
- new condition types;
- unrelated refactors or dependency upgrades.
