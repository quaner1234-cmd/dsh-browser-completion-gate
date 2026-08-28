# DSH Browser Completion Gate

A small DSH plugin that gives browser-agent tasks an external, deterministic completion check.

The core idea is simple: **an agent saying “done” is not proof that the task is actually done**. The plugin adds a `completion_gate_check` tool that evaluates explicit completion conditions and returns a machine-readable receipt:

- `PASS` — every condition is satisfied;
- `FAIL` — at least one condition is definitely false;
- `BLOCKED` — the condition cannot be evaluated reliably, so the gate never silently reports success.

It does **not** use an LLM judge and it does **not** implement another browser automation layer. Browser checks reuse the existing `dsh-browser` bridge.

## What it can verify

The v0.1.0 MVP supports three condition types:

- **file** — existence, non-empty, minimum size, SHA-256;
- **json_state** — an exact field / object must equal the expected value;
- **browser** — final URL, visible text, or selector text must match the declared condition.

Conditions can be supplied inline or stored in a user-editable JSON file through `conditionsPath`.

## Why this exists

Browser agents can produce a plausible success signal without producing the required durable result. Examples include:

- a page says “Download started” but the expected file does not exist;
- the wrong record was changed even though the UI looked successful;
- the browser ended on the wrong page;
- the agent reports completion after only checking its own action path.

Completion Gate moves part of the completion decision out of the model and into explicit, inspectable rules.

## Quick start

This repository currently ships the plugin as a DSH dynamic Host plugin.

1. Open a DSH session with the `cordis` plugin tools available and use this repository as the workspace.
2. Ask the agent to read `gate/plugin-host.generated.js`, define it as a new dynamic Host plugin with `cordis_define`, and run it with `cordis_run`.
3. Call `completion_gate_check` with either inline `conditions` or a `conditionsPath` JSON file.

Example condition file:

```json
[
  {
    "id": "artifact",
    "kind": "file",
    "path": "results/report.csv",
    "exists": true,
    "nonEmpty": true
  }
]
```

Then call:

```text
completion_gate_check { "conditionsPath": "completion.conditions.json" }
```

See [`gate/README.md`](gate/README.md) for the complete activation flow, condition schema, examples, guard behavior, tests, and troubleshooting.

## Current limitation

Current DSH does not expose a loop-level hook that can veto a model turn that ends with **no tool call**. The plugin therefore cannot force every possible model exit through the gate.

The v0.1.0 implementation provides the narrowest available enforcement: an optional per-agent tool guard that can deny selected tools until the latest Completion Gate receipt is `PASS`.

This limitation is documented rather than hidden.

## For agents working in this repository

Read [`AGENTS.md`](AGENTS.md) first. It defines the project goal, scope, active-instruction map, verification rules, and stopping discipline. Historical experiment files are evidence, not active work unless explicitly referenced by the current task.

## Status

- **Latest release:** `v0.1.0`
- **MVP status:** released and usable
- **Formal experiment work:** frozen
- **Next changes:** should be driven by real usage problems, not speculative feature expansion

Release: https://github.com/quaner1234-cmd/dsh-browser-completion-gate/releases/tag/v0.1.0
