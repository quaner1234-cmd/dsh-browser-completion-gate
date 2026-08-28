# TASK — Browser Completion Gate for DSH

## Current phase

Plugin MVP engineering.

The project is no longer pursuing V1 formal experiment setup. The dedicated-profile / dual-session control experiment, Baseline V1 18-trial arm, Gate V1 18-trial arm, and formal runbook are FROZEN and NOT active work.

Existing evidence is sufficient to proceed:

- the false-success failure mode has been reproduced;
- dsh-browser is pinned at `122de0e45ee97cba3428920d3d48b16e646b6db4`;
- current-session runtime smoke verification passed;
- the existing Completion Gate core/tool implementation and automated tests already exist on this branch.

## Immediate milestone — make the plugin usable

Turn the existing Completion Gate prototype into the smallest practical DSH plugin MVP.

Read `gate/README.md` first. Reuse the existing implementation; do not redesign from scratch.

Do only this milestone:

1. Inspect the current gate implementation and identify the minimum missing pieces between the existing prototype and an installable/usable DSH plugin.
2. Package/organize it so a normal user can install or activate it with a short documented procedure rather than pasting generated internals manually where avoidable.
3. Preserve the existing `completion_gate_check` behavior and structured PASS / FAIL / BLOCKED receipts.
4. Provide a minimal user-facing way to define completion conditions for at least:
   - file existence/non-empty;
   - JSON exact state;
   - browser URL/text/selector checks.
5. Use the smallest viable completion-enforcement mechanism supported by current DSH APIs. If DSH cannot truly veto turn completion, do NOT invent a large new loop framework. Clearly expose the limitation and use the narrowest practical contract/guard/tool integration available.
6. Run the existing automated tests plus any small tests needed for packaging/integration changes.
7. Perform one minimal live smoke test in DSH if it can be done without restarting DSH or manipulating Chrome/profile state. The goal is only to prove the plugin can load and `completion_gate_check` returns a real receipt. Do not run comparative trials.
8. Update the user-facing README with:
   - what the plugin does;
   - installation/activation;
   - one minimal example;
   - current limitations.
9. Commit and push all MVP changes to `prototype/minimum-completion-gate` and report exactly what is usable now.

## Definition of DONE for this milestone

DONE means a user can follow the README to activate the plugin and successfully call `completion_gate_check` to obtain a deterministic PASS / FAIL / BLOCKED receipt in DSH.

Do not require formal experimental evidence to call this milestone done.

## Human Gate

Stop and ask only if the remaining step requires one of these:

- restarting/terminating DSH;
- reloading/closing/manipulating Chrome or Chrome profiles;
- credential/security interaction;
- destructive system changes.

Do not ask the human to perform experiment-only setup.

## Not authorized

- no dual-session/tab-affinity experiment;
- no dedicated-profile experiment work;
- no Baseline V1 or Gate V1 trial collection;
- no 18+18 experiment;
- no V1 formal runbook;
- no statistical benchmarking;
- no new browser-control framework;
- no unrelated dependency upgrades.

If the plugin MVP becomes usable, STOP. Research mode may resume only if the human explicitly requests it.
