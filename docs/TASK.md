# TASK — Browser Completion Gate for DSH

## Current phase

MVP user acceptance and freeze.

The Completion Gate plugin MVP has been implemented and live-smoke-tested on this branch. Formal experiment work remains frozen. The purpose of this milestone is only to verify that the README path works from a clean DSH session and then freeze the MVP.

## Immediate milestone — clean-session acceptance

Do only this milestone:

1. Start from a fresh DSH session using the repository as workspace and the preset required by `gate/README.md`.
2. Follow the README activation path as written. Do not use hidden state from the previous development session.
3. Verify the plugin reaches `running` and registers `completion_gate_check`.
4. Perform exactly three small acceptance calls:
   - one deterministic PASS;
   - one deterministic FAIL;
   - one deterministic BLOCKED.
5. Confirm the receipts contain the documented structured evidence (`overall`, `checks`, expected/observed/reason where applicable).
6. If practical in the same clean session, perform one guard check: arm one harmless tool name on FAIL/BLOCKED and confirm it is denied; obtain PASS and confirm it is released.
7. If any README step is ambiguous or fails, make the smallest documentation/packaging fix needed and rerun only the failed acceptance step.
8. Record a short acceptance note in the repository and push it.

## Definition of DONE

DONE means a fresh DSH session can follow `gate/README.md` and activate the plugin without development-session knowledge, then obtain real PASS / FAIL / BLOCKED receipts.

Once this passes, STOP development. Do not add more features.

## After PASS

Report that the MVP is ready to freeze as `v0.1.0`. The next repository action is release hygiene only: merge the working branch to `main` and create a version tag/release if the human wants to publish it.

## Not authorized

- no formal experiments;
- no Baseline/Gate trial collection;
- no dedicated-profile or dual-session testing;
- no statistical benchmarking;
- no new completion-loop framework;
- no new condition types;
- no unrelated refactors or dependency upgrades;
- no feature expansion after acceptance passes.

If acceptance passes, STOP.
