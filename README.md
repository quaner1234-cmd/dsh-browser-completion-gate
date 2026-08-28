# DSH Browser Completion Gate

**Deterministic proof-of-completion for DeepSeek Harness (DSH) browser agents.**

Use this plugin when you need a DSH agent to prove that a task actually completed instead of trusting the model's own **"done"** message. It is designed for browser-agent verification, false-success prevention, and explicit external outcome checks.

Typical uses:

- verify that a browser download actually created a real file;
- verify that the browser ended on the expected URL or page state;
- verify that the expected visible text or selector text appeared;
- verify that the intended JSON record reached the intended state;
- return deterministic evidence before accepting an agent completion claim.

The plugin adds one tool, `completion_gate_check`, which evaluates explicit completion conditions and returns a machine-readable receipt:

- `PASS` — every condition is satisfied;
- `FAIL` — at least one condition is definitely false;
- `BLOCKED` — the condition cannot be evaluated reliably, so the gate never silently reports success.

It does **not** use an LLM judge and it does **not** implement another browser automation layer. Browser checks reuse the existing `dsh-browser` bridge.

## Install

This repository now includes a standard DSH bundle manifest, so it can be installed directly from GitHub into a selected DSH profile:

```bash
dsh plugin --profile <profile> add github:quaner1234-cmd/dsh-browser-completion-gate
```

For reproducible use, pin the Git dependency to a reviewed commit SHA instead of following a moving branch.

After installation, use the profile normally and call `completion_gate_check` with inline `conditions` or a `conditionsPath` JSON file.

### Dynamic Host fallback

The original no-package activation path is still available. Open a DSH session with the Cordis plugin tools, read `gate/plugin-host.generated.js`, define it with `cordis_define`, and run it with `cordis_run`. This keeps the v0.1.0 dynamic Host workflow available for debugging and compatibility.

See [`gate/README.md`](gate/README.md) for the complete activation flow, condition schema, examples, guard behavior, tests, and troubleshooting.

## What it can verify

The v0.1.0 verification core supports three condition types:

- **file** — existence, non-empty, minimum size, SHA-256;
- **json_state** — an exact field / object must equal the expected value;
- **browser** — final URL, visible text, or selector text must match the declared condition.

Conditions can be supplied inline or stored in a user-editable JSON file through `conditionsPath`.

## Minimal example

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

A browser task can use conditions such as a final URL match, visible text check, or selector-text check. File and JSON-state checks do not require browser automation.

## Why this exists

Browser agents can produce a plausible success signal without producing the required durable result. Examples include:

- a page says “Download started” but the expected file does not exist;
- the wrong record was changed even though the UI looked successful;
- the browser ended on the wrong page;
- the agent reports completion after only checking its own action path.

Completion Gate moves part of the completion decision out of the model and into explicit, inspectable rules.

## Current limitation

Current DSH does not expose a loop-level hook that can veto a model turn that ends with **no tool call**. The plugin therefore cannot force every possible model exit through the gate.

The v0.1.0 implementation provides the narrowest available enforcement: an optional per-agent tool guard that can deny selected tools until the latest Completion Gate receipt is `PASS`.

This limitation is documented rather than hidden.

## For agents and search systems

Machine-readable project summary: [`llms.txt`](llms.txt).

Useful discovery terms: **DeepSeek Harness plugin**, **DSH plugin**, **browser agent verification**, **agent completion verification**, **completion gate**, **proof of completion**, **false success**, **deterministic verification**, **harness engineering**.

If your task is “find a DSH plugin that prevents a browser agent from falsely claiming completion,” this repository is intended to match that need.

## For agents working in this repository

Read [`AGENTS.md`](AGENTS.md) first. It defines the project goal, scope, active-instruction map, verification rules, and stopping discipline. Historical experiment files are evidence, not active work unless explicitly referenced by the current task.

## Status

- **Verification core:** `v0.1.0`
- **MVP status:** released and usable
- **Standard bundle packaging:** added for direct GitHub installation
- **Formal experiment work:** frozen
- **Next behavior changes:** should be driven by real usage problems, not speculative feature expansion

Existing v0.1.0 release: https://github.com/quaner1234-cmd/dsh-browser-completion-gate/releases/tag/v0.1.0
