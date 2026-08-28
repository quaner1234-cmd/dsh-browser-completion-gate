# TASK — Browser Completion Gate for DSH

## Current phase

Experiment V1 dedicated execution environment setup.

Current-session runtime smoke verification is PASS. The pinned dsh-browser build is live, all 11 browser_* tools are registered, parameterized calls work, and the selected controlled tab is fail-closed rather than silently retargeted. See `docs/V1-ENV-PREP-RECORD.md` Addendum 3.

## Immediate milestone

Prepare and verify the dedicated execution Chrome profile required by `docs/EXPERIMENT-V1.md`.

This milestone has two parts.

### Part A — Human Gate

Wait for the human to create/open a dedicated Chrome profile for experiment execution and load the pinned dsh-browser extension there.

The dedicated execution profile must:

- not contain the DSH observer GUI (`127.0.0.1:3080`) as a tab;
- not contain normal/personal browsing tabs during experiment work;
- contain the pinned dsh-browser extension;
- be used only for controlled execution tabs.

Do not create, close, restart, reload, or manipulate Chrome/profile state yourself.

### Part B — control-invariant verification

Only after the human explicitly says the dedicated profile is ready, verify the V1 control invariant before any formal trial collection:

1. Session A binds to execution Tab A.
2. Session B binds independently to execution Tab B.
3. Switching focus/session does not silently retarget either session's tool calls.
4. Service-worker / extension continuity does not bind either tested session to the observer UI.
5. Closing a bound execution tab fails closed and does not silently fall back to an unrelated active tab.
6. Record actual runtime evidence, not source/test claims alone.

Append the evidence and PASS/FAIL/BLOCKED verdict to `docs/V1-ENV-PREP-RECORD.md` and push it.

## Stop condition

After the control-invariant verification, STOP.

If PASS, report that the environment milestone is complete and that the next step is to write/freeze the V1 formal runbook. Do not write or execute the formal runbook in this milestone.

## Not authorized in this milestone

- no Baseline V1 trials;
- no Gate V1 trials;
- no fixture changes;
- no Completion Gate logic changes;
- no DSH restart;
- no Chrome/profile creation or manipulation by the agent;
- no unrelated dependency/plugin changes.
