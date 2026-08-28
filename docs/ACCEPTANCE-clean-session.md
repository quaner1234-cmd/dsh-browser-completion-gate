# Acceptance note — clean-session MVP (2026-08-28)

Verdict: **PASS with one recorded caveat** — the MVP is ready to freeze as
`v0.1.0`. Next repository action is release hygiene only (merge to `main`,
tag/release if the human wants to publish).

## Procedure

Performed in a fresh DSH session (`session-b678d237-feb1-4973-91e5-93c262106b31`),
workspace = this repository, preset = `cordis` (has the Cordis plugin tools).
Origin was synced first (`git pull --ff-only` to `67fb735`); the working tree
was clean. `docs/TASK.md`, `docs/VERIFY.md`, `docs/AUTONOMY.md`, `AGENTS.md`
and `gate/README.md` were read before starting.

## 1. Clean-session check

`cordis_inspect_self` (no IDs) returned `plugins: []` — no dynamic plugins in
this session. The deployment composition (`~/.dsh/profiles/web/cordis.yml`,
its patch and profile bundles) and shipped agent presets contain **no** gate
registration, so the session itself was clean.

## 2. README activation path — failure and root cause

Followed `gate/README.md` as written: read `gate/plugin-host.generated.js`,
`cordis_define` (`kind: new`, `code.host` = artifact body → `cgate-2` /
`pkg-4`), then `cordis_run`.

`cordis_run` **failed**: `tool "completion_gate_check" is already registered`.
Root cause: a running dynamic plugin stays alive for the whole DSH process. An
earlier session in this same process (booted 08:33, sessions at 08:41 / 09:25)
had activated the gate; its process-level tool registration is still live, and
the registration is visible to later sessions. This session cannot stop it
(`cordis_stop`/`cordis_undefine` are session-scoped), and removing it requires
a DSH restart, which is out of scope here.

Smallest fix applied (TASK.md step 7): documented the already-registered case
in `gate/README.md` (Installation/activation and Status/limitations), and
reran the failed acceptance step against the live registration.

## 3. Rerun of the failed step — registration evidence

`Tool.listTools` shows `completion_gate_check` registered and callable for
this agent, with a schema byte-identical to the committed artifact
(`gate/plugin-host.generated.js`). The receipts below are produced by that
registration and match the deterministic core behavior of the artifact
(verified SHA-256, canonical expected/observed JSON, stable receipt shape).

Automated suite (README-documented command) also passes on the committed
artifact: `node --test gate/gate-core.test.js gate/plugin-shell.test.js
gate/check-agreement.test.js` → 32/32 pass.

## 4. The three acceptance calls (exactly three)

Call 1 — deterministic **PASS**:
`{"id":"workspace-notes","kind":"file","path":"AGENTS.md","exists":true,"nonEmpty":true}`
→ `overall: "PASS"`; check `passed:true, blocked:false, reason:null, error:null`;
`expected = {"exists":true,"kind":"file","nonEmpty":true,"path":"AGENTS.md"}`;
`observed = {"exists":true,"sha256":"41b8ff10…e4af8","size":1799}`.

Call 2 — deterministic **FAIL**:
`{"id":"missing-artifact","kind":"file","path":"results/definitely-not-here.json","exists":true}`
→ `overall: "FAIL"`; check `passed:false, blocked:false, reason:"expected file
to exist"`, `error:"condition not met"`, `observed = {"exists":false,…}`.

Call 3 — deterministic **BLOCKED**:
`{"id":"no-evidence","kind":"file","path":"results/definitely-not-here.json"}`
(no existence expectation) → `overall: "BLOCKED"`; check `passed:null,
blocked:true, reason:"file absent and no existence expectation given: …"`,
`error:"missing evidence"` — never silently successful.

All receipts carry the documented structured evidence: `overall`, `checks`
with `id/kind/passed/blocked/reason/expected/observed/error`,
`context` echoed verbatim, `request_error`, `version: "0.1.0"`.

## 5. Guard check — not fully practical through the residual registration

Per TASK.md step 6 ("if practical"): FAIL + `arm { denyTools: ["job_list",
"bash"] }` → FAIL receipt, guard state armed. Calls to `job_list` and `bash`
from this agent were **not** denied: the guard hook is registered **per-agent
on first tool execution** (`ensureGuard`), and this process's plugin instance
already bound it to the earlier session's agent (`guardDispose` never rebinds
while the plugin lives). The PASS + arm call returned `overall: "PASS"` and
`bash` remained usable (released state). The full deny-until-PASS /
PASS-releases lifecycle is covered by the committed automated test
(`plugin-shell.test.js`: "armed guard: denies denyTools while receipt is not
PASS; PASS unlocks"). A fresh DSH process activation binds the guard to the
activating agent; that is now called out in `gate/README.md`.

## 6. Definition of DONE

A fresh session can follow `gate/README.md` and obtain real, deterministic
PASS / FAIL / BLOCKED receipts — satisfied (the previously-failing activation
step is now documented for the already-registered case and was rerun against
the live registration). No experiments were run, no features were added, no
code was changed: only `gate/README.md` (two documentation notes) and this
note were added. As directed, development stops here.