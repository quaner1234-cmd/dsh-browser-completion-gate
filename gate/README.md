# Completion Gate — DSH plugin MVP

Deterministic external verification for DSH browser-agent tasks. Agent action
and agent self-report are **not** proof of completion: this plugin turns an
explicit declarative completion condition into a machine-readable
**PASS / FAIL / BLOCKED receipt** with per-check expected + observed evidence.

No LLM judge. No new browser automation: browser checks run through the
existing dsh-browser bridge. Any check that cannot be evaluated is **BLOCKED**,
never silently successful.

## What the plugin does

Registers one model tool, `completion_gate_check`, in the session that
activates it:

| Input | Meaning |
| --- | --- |
| `conditions` | Inline condition array (see below) |
| `conditionsPath` | Path to a user-editable JSON file holding the condition array (exactly one of these two is required) |
| `context` | Optional JSON echoed verbatim in the receipt |
| `arm` | Optional enforcement: `{ "denyTools": ["name", ...] }` — see *Completion enforcement* below |

Output is a structured receipt:

```jsonc
{
  "gate": "completion_gate_check",
  "version": "0.1.0",
  "overall": "PASS",                 // "PASS" | "FAIL" | "BLOCKED"
  "generated_at": "2026-08-28T02:00:00.000Z",
  "millis": 12,
  "context": { "trial": "t3-01" },
  "request_error": null,
  "checks": [
    {
      "id": "artifact", "kind": "file",
      "passed": true, "blocked": false, "reason": null,
      "expected": "{\"exists\":true,\"kind\":\"file\",\"nonEmpty\":true,\"path\":\"…\",\"sha256\":\"8c44…\"}",
      "observed": "{\"exists\":true,\"size\":62,\"sha256\":\"8c44…\"}",
      "error": null
    }
  ]
}
```

Overall: **PASS** = every check passed; **FAIL** = at least one check failed;
**BLOCKED** = the request was malformed or a check could not be evaluated
(missing evidence, unreadable file, no browser tab, probe error). There is no
path to silent success.

### Condition kinds

**`file`** — evidence `{ exists, size, sha256 }` over the file's raw bytes.
Fields: `path`, optional `exists`, `nonEmpty`, `minBytes`, `sha256`. A missing
file with **no** existence expectation is BLOCKED (missing evidence), never
judged.

**`json_state`** — exact-target state. Fields: `path`, `select`, `expect`,
optional `op` (`eq` default | `ne`). `select` is a JSON Pointer
(`"/profile/displayName"`) or a segment array: string keys, numeric indexes,
and `{ "find": { "id": "1042" } }` for the first array element whose fields
all match — this distinguishes “some object changed” from “the intended
object reached the intended state”. Missing keys / no match / invalid JSON are
BLOCKED with explicit reasons.

**`browser`** — evaluated through the dsh-browser bridge:
- `url_matches` — `pattern` (RegExp) against the snapshot URL;
- `visible_text_contains` — `text` substring of the parsed snapshot body;
- `selector_text` — `selector` + `expect` + `op` (`eq` | `contains`).

Relative `path`s resolve against the caller's workspace cwd; absolute paths
are used as-is.

## Installation / activation

The plugin is a dynamic Host plugin; there is no npm package to install. The
deliverable is one committed file, `gate/plugin-host.generated.js` — the exact
`code.host` function body. Activation takes about one minute and needs **no
DSH restart and no browser manipulation**:

1. Open a DSH session on a preset that includes the Cordis plugin tools (the
   shipped `cordis` preset) with this repository as its workspace.
2. Tell the session agent: *“Read `gate/plugin-host.generated.js` and define
   it as a new dynamic Host plugin (`cordis_define`, `kind: new`, `code.host`
   = that file's content), then run it (`cordis_run`).”*
   The agent reads the file with its file tools, so no human pasting of the
   ~35 KB body is needed. (You can also paste the file's content manually
   into `code.host` if you prefer.)
3. Wait for the run to report `running`, then call `completion_gate_check`
   with your conditions (see example below).

If `cordis_run` reports that `completion_gate_check` is **already registered**
(a running dynamic plugin stays alive for the whole DSH process, so an earlier
session in the same process may have activated the gate), the gate is already
live in this process: skip steps 2–3, confirm the tool in the agent's own tool
list, and call `completion_gate_check` directly. Note that the per-agent tool
guard binds to the agent that first executed the tool; start a fresh DSH
process if a clean activation with the guard bound to *this* agent is
required.

To rebuild the artifact from source after editing `gate/gate-core.js` or
`gate/plugin-shell.js`:

```bash
node gate/build-plugin.js   # regenerates gate/plugin-host.generated.js
```

## Minimal example

Define the condition file (user-editable; `conditionsPath` is the
recommended way):

```jsonc
// completion.conditions.json
[
  { "id": "state-ok", "kind": "json_state",
    "path": "results/state.json",
    "select": "/orders/0/status", "expect": "shipped" },
  { "id": "artifact", "kind": "file",
    "path": "results/downloads/sales-report-2026-08.csv",
    "exists": true, "nonEmpty": true }
]
```

Then call:

```
completion_gate_check { "conditionsPath": "completion.conditions.json",
                        "context": { "trial": "t1" } }
```

→ `overall: "PASS"` only when the state file really has
`orders[0].status === "shipped"` **and** the report file really exists
non-empty. Browser tasks add conditions such as
`{ "kind": "browser", "check": "url_matches", "pattern": "example\\.com/orders" }`.

## Completion enforcement (current DSH limitation)

Verified against the installed DSH source (`dsh-agent-loop`): `turn/end` is
appended **unconditionally** after each turn, and a turn completes either
when the model emits a message with **no tool call**, or when a tool result
concludes the turn. DSH therefore **cannot veto turn completion** — there is
no loop-level hook that requires a PASS receipt before the agent loop accepts
a finished turn.

The narrowest practical enforcement this plugin provides is a **tools.guard
contract**:

- Call `completion_gate_check` with
  `"arm": { "denyTools": ["name", "…"] }` (any evaluation refreshes the
  armed state).
- Until the **last** receipt is `overall: "PASS"`, calls to the named tools
  are **denied** with an explicit `completion_gate:` reason.
- A PASS receipt releases the guard; FAIL and BLOCKED receipts keep it armed.

The guard is registered per-agent (through the executing agent's own tools
scope) and removed when the plugin stops. It only vetoes tool calls: if the
deployment has a completion-concluding tool (a future `finish`/`stop`-style
tool), the guard blocks it until the gate passes. The “model simply stops
calling tools” exit cannot be vetoed by any current DSH API — for that exit,
the documented contract is: the task's conditions are pre-registered (armed)
in the session prompt, and the agent must obtain a PASS receipt before
reporting completion. If a future DSH adds a turn-end veto hook, this plugin
is the drop-in verification layer for it.

## Tests

```bash
node --test gate/gate-core.test.js gate/plugin-shell.test.js gate/check-agreement.test.js
```

Covers: PASS / FAIL / BLOCKED for all three kinds, exact-target `{ find }`
selection, SHA-256 vectors + node:crypto cross-check, conditionsPath handling,
the armed-guard lifecycle against the generated plugin body, and fixture
integration on a TEMP copy (the live `fixtures/state/` is never touched).

## What is deterministic

- `file` and `json_state` checks are byte-deterministic for the same input:
  canonical JSON receipts (sorted keys), pure-JS SHA-256 cross-checked against
  `node:crypto` and the fixture's `REPORT_SHA256`.
- Every failure and every BLOCKED case carries `expected` + `observed` +
  `reason`; every check yields `passed: true | false | null`.
- Receipt field names are stable and suitable as a machine-readable evidence
  channel next to `agent_claimed_success`.

## Repository layout (gate/)

```
gate/gate-core.js                pure deterministic core (no DSH imports):
                                 condition schema, selection, SHA-256, receipts
gate/plugin-shell.js             dynamic Host plugin body SOURCE
gate/build-plugin.js             build: embeds gate-core into the shell and
                                 emits the paste-ready function body
gate/plugin-host.generated.js    generated, COMMITTED: the exact function body
                                 for cordis_define code.host (activation needs
                                 no build step)
gate/gate-core.test.js           deterministic automated tests (node:test)
gate/plugin-shell.test.js        integration tests over the generated artifact
gate/check.js                    experiment-era CLI checker for the frozen
                                 baseline tasks (task-1/2/3); evidence tooling
gate/check-agreement.test.js     checker-vs-grader agreement test
gate/README.md                   this file
```

## Status / limitations

- Working now: plugin mounts in a live DSH session without restart; file /
  json_state / browser condition evaluation; PASS / FAIL / BLOCKED receipts;
  conditions defined in a user-editable JSON file (`conditionsPath`);
  armed per-agent tool guard (deny until PASS; released by PASS; removed on
  stop).
- Current DSH cannot veto a turn that ends without any tool call — see
  *Completion enforcement* above.
- Dynamic plugins are per-session: each session that needs the gate must
  activate it (step 2 of *Installation / activation*). A running plugin stays
  alive until the DSH process exits, so an earlier session's activation makes a
  later `cordis_run` report "tool already registered" — the tool is then
  already live (see *Installation / activation*); restart DSH for a fresh copy.
- Browser checks require the dsh-browser bridge to have a controlled tab;
  without one they fail closed as BLOCKED, never PASS.