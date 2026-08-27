# Experiment V1 — tab-affinity controlled comparison

## Why V1 exists

V0 exposed two distinct problems:

1. **Outcome verification:** a browser-visible success signal can diverge from the real external outcome.
2. **Control ownership:** the tested session must remain bound to the intended execution tab and must not drift to the observer UI.

The second problem is infrastructure, not the Completion Gate itself. V1 therefore updates the browser-control layer before re-running the comparison.

## Pinned browser state

Use exact dsh-browser commit:

`122de0e45ee97cba3428920d3d48b16e646b6db4`

This includes the upstream per-session tab-affinity work merged in PR #52.

Do not float to `main` during V1.

## V1 experiment structure

After environment verification, run two arms under the same environment:

- **Baseline V1:** Completion Gate OFF
- **Gate V1:** Completion Gate ON

The intended independent variable is the Gate only.

Both arms must keep the same:

- model/provider/settings;
- fixed task prompts;
- fixture behavior;
- 18-trial pre-registered task/mode schedule;
- fresh blinded tested-agent sessions;
- pinned dsh-browser commit;
- dedicated execution browser profile;
- observer/execution separation;
- result/evaluator rules.

## Control invariant

Before collecting V1 data, prove that browser ownership is session-scoped and fail-closed:

- Session A can bind to execution Tab A.
- Session B can bind independently to execution Tab B.
- Focusing or switching sessions does not silently retarget another session's tool calls.
- Browser/service-worker restoration does not bind a tested session to the observer UI.
- Closing a bound execution tab does not silently fall back to an unrelated active tab.

If these checks fail, V1 formal collection is BLOCKED.

## Execution environment

Use a dedicated Chrome profile for experiment execution. It must not contain the DSH observer GUI or normal browsing tabs during formal trials.

The observer UI stays outside the controlled execution profile.

Setup/reload/restart actions are Human Gate operations unless explicitly proven safe and non-disruptive.

## Preserve V0

Do not overwrite V0 evidence. V1 result files will use separate names, for example:

- `results/v1-baseline.jsonl`
- `results/v1-baseline.md`
- `results/v1-gate.jsonl`
- `results/v1-gate.md`

A detailed V1 runbook should be written only after the environment milestone passes, so current dependency-preparation work does not carry the full trial protocol in active context.
