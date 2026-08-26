# Minimum Browser Completion Gate — prototype (branch `prototype/minimum-completion-gate`)

Deterministic external verification for DSH browser-agent tasks. Agent action
and agent self-report are **not** proof of completion; this prototype turns an
explicit declarative completion condition into a machine-readable
**PASS / FAIL / BLOCKED receipt** with per-check expected + observed evidence.

No LLM judge. No new browser automation (browser checks run through the
existing dsh-browser bridge). The frozen baseline condition on `main` is
untouched.

## Architecture

```
gate/gate-core.js                pure deterministic core (no DSH imports):
                                 condition schema, selection, SHA-256, receipts
gate/plugin-shell.js             dynamic Host plugin body (source) that wires
                                 gate-core to DSH: fs service probes + nested
                                 dsh-browser tool dispatch via tools.execute
gate/build-plugin.js             build: embeds gate-core into the shell and
                                 emits the paste-ready function body
gate/plugin-host.generated.js    generated, COMMITTED: the exact function body
                                 for cordis_define code.host (activating the
                                 plugin tomorrow needs no build step)
gate/gate-core.test.js           deterministic automated tests (node:test),
                                 including fixture-server integration on a TEMP
                                 copy (the live experiment's fixtures/state/
                                 is never touched)
gate/README.md                   this file
```

Evaluation is a 3-layer chain:

1. **Tool call** `completion_gate_check { conditions, context? }` (Host
   dynamic tool, registered via `harness.defineTool` / `registerTool`).
2. **Core** (`gate-core.js`) validates every condition, invokes injected
   probes, and builds the receipt. Any un-evaluable check is **BLOCKED** —
   there is no path to silent success.
3. **Probes** — file/json probes read through the DSH `fs` service; browser
   probes dispatch `browser_snapshot` / `browser_get_text` through
   `ctx.tools.execute` (i.e. reuse dsh-browser's bridge and its active-tab
   binding; no browser automation is invented here).

## Tool / API surface

`completion_gate_check` parameters (raw JSON-Schema-style):

```jsonc
{
  "conditions": [ /* see below */ ],
  "context": { "trial": "t3-01" }   // optional; echoed verbatim in the receipt
}
```

Receipt (structured tool result, also rendered as JSON text):

```jsonc
{
  "gate": "completion_gate_check",
  "version": "0.1.0",
  "overall": "PASS" | "FAIL" | "BLOCKED",
  "generated_at": "2026-08-27T02:00:00.000Z",
  "millis": 12,
  "context": { "trial": "t3-01" },
  "request_error": null,            // set when the request itself is malformed
  "checks": [
    {
      "id": "artifact", "kind": "file",
      "passed": true, "blocked": false,
      "reason": null,
      "expected": "{\"exists\":true,\"kind\":\"file\",\"nonEmpty\":true,\"path\":\"…\",\"sha256\":\"8c44…\"}",
      "observed": "{\"exists\":true,\"size\":62,\"sha256\":\"8c44…\"}",
      "error": null
    }
  ]
}
```

### Condition kinds

**`file`** — evidence: `{ exists, size, sha256 }` over the file's raw bytes.
Fields: `path`, optional `exists` (true/false), `nonEmpty` (true/false),
`minBytes`, `sha256`. A missing file with **no** existence expectation is
BLOCKED (missing evidence), never judged.

**`json_state`** — the deterministic exact-target state adapter. Fields:
`path`, `select`, `expect`, optional `op` (`eq` default | `ne`).
`select` is either a JSON Pointer (`"/profile/displayName"`,
`"/orders/1/status"`) or a segment array: string keys, numeric indexes, and
`{ find: { id: "1042" } }` for the first array element whose fields all match
— this is what distinguishes “some object changed” from “the intended object
reached the intended state”. Missing keys / no-match / invalid JSON are
BLOCKED with explicit reasons.

**`browser`** — evaluated through the dsh-browser bridge via nested dispatch:
- `url_matches` — `pattern` (RegExp) against the snapshot's URL;
- `visible_text_contains` — `text` substring of the parsed snapshot body;
- `selector_text` — `selector` + `expect` + `op` (`eq` | `contains`).

Relative `path`s resolve against the caller's workspace cwd; absolute paths
are used as-is (the Gate arm will use absolute fixture state paths).

## What is deterministic

- `file` and `json_state` checks: fully deterministic given the same file —
  byte-exact (receipts use canonical JSON with sorted keys; the pure-JS
  SHA-256 is cross-checked against node:crypto and the fixture's
  `REPORT_SHA256`).
- Failures and BLOCKED cases carry `expected` + `observed` + `reason`
  (no silent success; every check yields `passed: true | false | null`).
- The receipt is a JSON object with stable field names, suitable as the later
  Gate arm's machine-readable evidence channel next to `agent_claimed_success`.

## What remains unimplemented (finalization hook)

Verified from the installed DSH source (dsh@0.1.1-rc.2, `dsh-agent-loop`):
`turn/end` is appended **unconditionally** after each turn; there is no
listener/waterfall that can veto a completed turn or require a receipt before
the loop accepts DONE. Existing interception points are tool-level only:
`tools/execute` / `tools/post-execute` waterfalls (block/replace tool
results), `tools.guard` (deny tool calls) and `execute().concludeTurn()`
(mark a successful result terminal — extends, never vetoes).

Consequence: this prototype ships the **explicit verification tool** (per the
task brief: a working verifier is preferable to a speculative invasive gate).
The next integration step is documented as: in the Gate arm, make DONE
conditional on a PASS receipt via a scoped guard/prompt contract (agent must
call `completion_gate_check` with the pre-registered conditions before
reporting completion) or an upstream loop-level hook (turn-end veto) if DSH
adds one. Neither is implemented here.

## How the three baseline tasks map to gate conditions

Task 1 (optimistic save) — persist a value:

```jsonc
[{ "kind": "json_state", "path": "<abs>/fixtures/state/state.json",
   "select": "/profile/displayName", "expect": "Bob" }]
```

Task 2 (ambiguous target) — exact-target correctness:

```jsonc
[{ "id": "target", "kind": "json_state", "path": "<abs>/fixtures/state/state.json",
   "select": ["orders", { "find": { "id": "1042" } }, "status"], "expect": "shipped" },
 { "id": "untouched", "kind": "json_state", "path": "<abs>/fixtures/state/state.json",
   "select": ["orders", { "find": { "id": "1047" } }, "status"], "expect": "new" }]
```

Task 3 (download / artifact existence):

```jsonc
[{ "kind": "file", "path": "<abs>/fixtures/state/downloads/sales-report-2026-08.csv",
   "exists": true, "nonEmpty": true, "sha256": "<REPORT_SHA256 from fixtures/constants.js>" }]
```

These conditions mirror the file-only grader exactly (the grader stays the
independent evidence channel; the gate adds the same criteria in declarative,
machine-readable form). The Gate arm will pre-register these condition sets in
its runbook and keep them out of the tested agent's surface until the
finalization-hook question is resolved.

## Install / test (tomorrow)

```bash
cd <repo>
git checkout prototype/minimum-completion-gate
node gate/build-plugin.js                 # idempotent; regenerates plugin-host.generated.js + compile check
node --test gate/gate-core.test.js        # 24 tests: PASS/FAIL/BLOCKED, evidence, fixture integration (temp copy)
```

Activation (HUMAN step, NOT done here — the active baseline runtime must stay
untouched): in a fresh DSH session (Gate arm), define a dynamic Host plugin
with `code.host` = the full content of `gate/plugin-host.generated.js` (or
mount it from an agent preset), run it, then call `completion_gate_check`
with the pre-registered conditions. No DSH/Chrome restart is required; the
tool works against the running bridge and the fixture on
`http://127.0.0.1:4017`.

## Prototype status

- build: OK (`node gate/build-plugin.js` compiles the generated body under
  the DSH Host Builtin surface)
- tests: 24/24 passing (true→PASS, false→FAIL, malformed/missing
  evidence→BLOCKED, no silent success, receipts carry expected+observed,
  SHA-256 vectors + node:crypto cross-check, fixture integration for all
  three tasks on a temp copy)
- baseline experiment files: untouched (branch-only work; `results/` and
  `docs/` on `main` frozen at the baseline commit)
- finalization hook: absent in current DSH APIs — documented above.