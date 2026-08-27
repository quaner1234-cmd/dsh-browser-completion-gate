# TASK — Browser Completion Gate for DSH

## Current phase

Experiment V1 environment preparation.

V0 is preserved as historical evidence. It established a 4/18 false-success baseline under the old frozen browser environment and later exposed cross-session/tab leakage during Gate calibration.

## Immediate task

Normalize the managed dsh-browser dependency to the exact pinned upstream commit:

`122de0e45ee97cba3428920d3d48b16e646b6db4`

This commit includes the upstream per-session tab-affinity work merged in PR #52.

Read `docs/EXPERIMENT-V1.md` for the rationale and V1 invariants before changing the dependency.

Do only this milestone:

1. inspect the current `~/.dsh/dsh-browser` HEAD, branch, status, remotes, and local diff;
2. move it to the pinned upstream state above, preferring clean upstream code over obsolete local workarounds;
3. rebuild and run the relevant tests;
4. record the previous state, final commit, remaining local diff, build result, test result, and expected browser tool count;
5. update/push project documentation needed to record the result.

## Human Gate / stop condition

Do NOT restart DSH.
Do NOT reload, close, retarget, or operate Chrome.
Do NOT create or manipulate a Chrome profile.

If runtime verification requires DSH restart, extension reload, or browser-profile setup, stop and report the exact human actions required.

## Not authorized in this milestone

- no Baseline V1 trials;
- no Gate V1 trials;
- no Completion Gate logic changes;
- no fixture changes;
- no generalized plugin work;
- no unrelated dependency upgrades.

This milestone ends when the new browser dependency is built/tested and ready for a human-triggered runtime verification.
