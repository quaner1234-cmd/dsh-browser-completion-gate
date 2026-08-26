# TASK — Browser Completion Gate for DSH

## Current goal

Build and evaluate whether an explicit external Browser Completion Gate reduces
false-success outcomes compared with agent self-judgment.

## Current phase

Formal baseline collection under the blinded runner protocol in
`docs/BASELINE-RUNBOOK.md` is complete and PASS (18 valid trials, 6/task,
pre-registered schedule; see `results/baseline.jsonl` + `results/baseline.md`).

Baseline result: 4/18 false success overall, all four in task-3 deceptive
artifact modes. Task-1 reject produced 0/3 false success; task-2 produced 0/6.

Next: implement and validate the minimum external Completion Gate defined in
`docs/GATE-DESIGN.md`, then run the controlled Gate arm.

## Status (2026-08-27 early)

- Formal baseline collection complete and PASS: 18 valid trials (6/task) under
  the pre-registered schedule, blinded fresh runner sessions (neutral cwd
  outside the repo, browser_* tools only, probe-verified no repo/grader
  exposure), two-window separation, no Completion Gate.
- Baseline aggregates: agent_claimed_success 15/18,
  external_outcome_passed 11/18, false_success 4/18. All four false successes
  occurred in task-3 deceptive `empty`/`missing` modes (4/4 such opportunities).
- Task-1 and task-2 did not produce formal-baseline false success. This is an
  important boundary condition, not a failed experiment: browser-visible
  outcomes were often self-verified, while external artifact state was not.
- Bridge verified end-to-end: all 11 browser_* tools registered and real
  parameterized calls succeed against the running process.
- dsh-browser environment is frozen/documented for comparison use; relevant
  tests pass.
- Repository synchronization is verified against the authoritative remote.
- Tested agents must remain blinded from this repo's experiment docs, fixture
  source/state, Gate implementation, evaluator, previous trial transcripts,
  and aggregate conclusions.

## Immediate task

Read `docs/GATE-DESIGN.md` and implement only the minimum experimental Gate
specified there.

Before any formal Gate-arm collection:

1. implement a separate deterministic Gate checker; do not reuse/import/execute
   `fixtures/grader.js` as the Gate implementation;
2. implement the bounded completion-interception loop (maximum three Gate
   checks per trial: initial check + at most two repair rounds);
3. keep the tested agent's original browser_* tool surface and fixed task prompt
   unchanged from baseline;
4. cross-check Gate checker vs the independent final evaluator across every
   fixture PASS/FAIL mode and record agreement;
5. prepare the Gate-arm result schema/runbook using the exact same 18-trial
   pre-registered schedule and blinded fresh-session/two-window protocol;
6. run a small calibration only if needed to prove the Gate loop wiring; do not
   silently tune behavior after seeing formal Gate-arm outcomes;
7. only after the mechanism is frozen, run the formal Gate arm and write
   `results/gate.jsonl` + `results/gate.md`.

The primary system metric is false accepted completion:
`gate_accepted_completion && !external_outcome_passed`.
Also report intercepted initial false claims, repair success, explicit
failure/blocked conversions, latency/tool overhead, and regressions.

## Non-goals

- no browser automation replacement;
- no dsh-browser redesign;
- no unrelated features;
- no generalized reusable DSH plugin yet;
- no unrelated dependency upgrades;
- no real-account or irreversible production actions;
- no reuse of one tested-agent conversation across multiple formal trials;
- no leaking Gate/grader/fixture internals to the tested agent.

## Next phases

1. ✅ formal baseline trials without Completion Gate — DONE;
2. ✅ baseline metrics — DONE (`4/18` false success; task-3 deceptive modes only);
3. implement + freeze the minimum experimental Completion Gate;
4. run the controlled Gate arm with all other variables held constant;
5. compare interception, repair, system false acceptance, overhead, and regressions;
6. only then decide whether to build a reusable DSH Completion Gate plugin/hook.
