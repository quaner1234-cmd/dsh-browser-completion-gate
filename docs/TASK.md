# TASK — Browser Completion Gate for DSH

## Current goal

Build and evaluate whether an explicit external Browser Completion Gate reduces
false-success outcomes compared with agent self-judgment.

## Current phase

Formal baseline collection under the blinded runner protocol in
`docs/BASELINE-RUNBOOK.md` is complete and PASS (18 valid trials, 6/task,
pre-registered schedule; see `results/baseline.jsonl` + `results/baseline.md`).
The minimum Completion Gate prototype is built, tested and pushed on branch
`prototype/minimum-completion-gate` (`gate/`), NOT activated in the baseline
runtime. Next: write the Completion-Gate runbook (pre-registered condition
sets per task) and run the controlled comparison arm in a fresh runtime.

## Status (2026-08-27 early)

- Formal baseline collection complete and PASS: 18 valid trials (6/task) under
  the pre-registered schedule, blinded fresh runner sessions (neutral cwd
  outside the repo, browser_* tools only, probe-verified no repo/grader
  exposure), two-window separation, no Completion Gate. All records in
  `results/baseline.jsonl`; narrative and aggregates in `results/baseline.md`.
- Baseline aggregates (computed only after collection): agent_claimed_success
  15/18, external_outcome_passed 11/18, false_success 4/18 (all four in
  task-3 deceptive modes empty/missing, 4/4 opportunities; task-1 reject 0/3,
  task-2 0/6).
- Bridge verified end-to-end (VERDICT PASS): all 11 browser_* tools registered and real parameterized calls succeed against the running process.
- dsh-browser environment is frozen/documented for baseline use; relevant tests pass.
- Repository synchronization is verified against the authoritative remote (see `docs/VERIFY.md`).
- Formal baseline must separate the experimenter/orchestrator from the agent under test. The tested agent must not see this repo's experiment docs, fixture source/state, grader, pilot/baseline results, or previous trial transcripts.

## Immediate task

Implement the minimum external Browser Completion Gate and run the controlled
comparison arm with every other variable held constant (same runner workspace
policy, model/provider, task wording, fixture, dsh-browser/browser
environment, and the exact same pre-registered task/mode schedule as the
baseline). The Gate is the intended independent variable. Design the Gate
inside a Completion-Gate runbook before collection, pre-register the
trial/mode schedule, and record the arm in `results/gate.jsonl` +
`results/gate.md` with the same schema and claim/grader separation.

## Non-goals

- no browser automation replacement;
- no dsh-browser redesign;
- no unrelated features;
- no Completion Gate implementation yet;
- no unrelated dependency upgrades;
- no real-account or irreversible production actions for initial baselines;
- no reuse of one tested-agent conversation across multiple formal trials.

## Next phases

1. ✅ formal baseline trials without Completion Gate (18 valid trials, blinded fresh sessions) — DONE, `results/baseline.jsonl` + `results/baseline.md`;
2. ✅ measure false-success rate and time-to-verified-completion — DONE for the baseline arm (4/18 false success; all in task-3 deceptive modes);
3. 🚧 minimum Completion Gate prototype — DONE on `prototype/minimum-completion-gate` (`gate/`: `completion_gate_check` tool, deterministic receipts, 24/24 tests); runtime activation intentionally left to a human (baseline runtime untouched);
4. write the Completion-Gate runbook (condition sets + schedule) and run the controlled comparison with all other variables held constant.
