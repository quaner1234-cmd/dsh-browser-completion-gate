# TASK — Browser Completion Gate for DSH

## Current goal

Build and evaluate whether an explicit external Browser Completion Gate reduces
false-success outcomes compared with agent self-judgment.

## Current phase

Baseline preparation (fixtures + grader + prompts + pilot) is complete and
PASS. No Completion Gate has been implemented. Next: formal baseline
collection (≥5 trials per task) with the Completion Gate still absent.

## Status (2026-08-26 late)

- Bridge verified end-to-end (VERDICT PASS): all 11 browser_* tools registered and real parameterized calls succeed against the running process.
- dsh-browser environment is frozen/documented for baseline use; relevant tests pass.
- Repository synchronization failure was observed and converted into a verification rule: local commit alone is not PASS; authoritative remote state must be verified.
- Baseline experiment design is defined in `docs/BASELINE-DESIGN.md`.
- Baseline fixtures, grader, task prompts and calibration pilot are complete: `docs/FIXTURE-SPEC.md`, `fixtures/` (stdlib-only server + pages + `grader.js`), `tasks/task-{1,2,3}.md`, `results/pilot.jsonl` + `results/pilot.md`.
- Pilot verdict: PASS — all three fixtures reset deterministically and grade externally (file-only grader, exit 0/1/2); 2 trials per task done without a Completion Gate; deceptive states were reproduced (optimistic-save false success, wrong-object false success, empty-artifact false success) and remain externally detectable; no fixture changes required.

## Immediate task

Run the formal baseline per `docs/BASELINE-DESIGN.md`: ≥5 trials per task
(15+ trials), same model/task wording/fixture/plugin/browser environment as the
pilot, no Completion Gate. Record every trial in `results/baseline.jsonl`
(schema in `results/README.md`) with `agent_claimed_success`,
`external_outcome_passed`, and derived `false_success` recorded separately;
run trials in fresh agent sessions so no session memory carries between trials.

## Non-goals

- no browser automation replacement;
- no dsh-browser redesign;
- no unrelated features;
- no Completion Gate implementation yet;
- no unrelated dependency upgrades;
- no real-account or irreversible production actions for initial baselines.

## Next phases

1. run baseline trials without Completion Gate (≥5 per task, fresh sessions);
2. measure false-success rate and time-to-verified-completion;
3. implement the minimum Completion Gate;
4. run controlled comparison with all other variables held constant.