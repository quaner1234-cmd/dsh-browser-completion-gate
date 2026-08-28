# TASK — Browser Completion Gate for DSH

## Current phase

Experiment V1 runtime verification.

The pinned dsh-browser environment is installed and built at:

`122de0e45ee97cba3428920d3d48b16e646b6db4`

Runtime round 2 verified the new bridge, 11 browser_* tools, new schemas, and live fail-closed tab affinity. See `docs/V1-ENV-PREP-RECORD.md`.

## Immediate task

Finish only the current-session runtime verification after the human reselects the controlled page in the dsh browser side panel.

Do only this milestone:

1. confirm the side-panel rebind succeeded for the current session;
2. run a small parameterized smoke check using the live browser tools (snapshot, get_text with a selector, and wait);
3. confirm the tools operate on the explicitly selected controlled page and do not silently retarget another tab;
4. append the evidence and PASS/FAIL/BLOCKED result to `docs/V1-ENV-PREP-RECORD.md` and push it.

## Stop condition

After this current-session smoke check, STOP.

Do not start the full two-session tab-affinity invariant test yet. That requires the dedicated execution Chrome profile defined in `docs/EXPERIMENT-V1.md` and therefore a Human Gate.

If the current-session smoke check passes, report exactly what human setup is required for the dedicated execution Chrome profile before the next milestone.

## Not authorized in this milestone

- no Baseline V1 trials;
- no Gate V1 trials;
- no fixture changes;
- no Completion Gate logic changes;
- no Chrome profile creation or manipulation;
- no DSH restart or Chrome reload;
- no unrelated dependency or plugin changes.
