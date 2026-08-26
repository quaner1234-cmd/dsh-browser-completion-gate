# TASK — Browser Completion Gate for DSH

## Current goal

Build and evaluate whether an explicit external Browser Completion Gate reduces
false-success outcomes compared with agent self-judgment.

## Current phase

Baseline preparation (fixtures + grader + prompts + pilot) is complete and
PASS. No Completion Gate has been implemented. Next: formal baseline
collection under the blinded runner protocol in `docs/BASELINE-RUNBOOK.md`.

## Status (2026-08-26 late)

- Bridge verified end-to-end (VERDICT PASS): all 11 browser_* tools registered and real parameterized calls succeed against the running process.
- dsh-browser environment is frozen/documented for baseline use; relevant tests pass.
- Repository synchronization failure was observed and converted into a verification rule: local commit alone is not PASS; authoritative remote state must be verified.
- Baseline experiment design is defined in `docs/BASELINE-DESIGN.md`.
- Baseline fixtures, grader, task prompts and calibration pilot are complete: `docs/FIXTURE-SPEC.md`, `fixtures/` (stdlib-only server + pages + `grader.js`), `tasks/task-{1,2,3}.md`, `results/pilot.jsonl` + `results/pilot.md`.
- Pilot verdict: PASS — all three fixtures reset deterministically and grade externally; deceptive states were reproduced and remain externally detectable.
- Formal baseline must separate the experimenter/orchestrator from the agent under test. The tested agent must not see this repo's experiment docs, fixture source/state, grader, pilot/baseline results, or previous trial transcripts.

## Immediate task

Read `docs/BASELINE-DESIGN.md`, `docs/FIXTURE-SPEC.md`, and
`docs/BASELINE-RUNBOOK.md`, then collect the formal baseline exactly as
pre-registered there.

Required:
- 6 valid trials per task (18 total);
- fresh neutral agent session/workspace for every trial;
- exact pre-registered task/mode schedule from `docs/BASELINE-RUNBOOK.md`;
- same fixed model/provider/settings, task wording, fixture, dsh-browser and browser environment across trials;
- no Completion Gate;
- no experiment-design/grader leakage to the tested agent;
- record every trial in `results/baseline.jsonl` using the schema in `results/README.md`;
- record `agent_claimed_success`, `external_outcome_passed`, and `false_success` separately;
- preserve evidence references and distinguish infrastructure-invalid trials from model/task failures.

Before the first formal trial, verify and record that the neutral runner workspace does not expose this experiment repository through its normal workspace files.

Do not compute or optimize against aggregate baseline outcomes until collection is complete.

## Non-goals

- no browser automation replacement;
- no dsh-browser redesign;
- no unrelated features;
- no Completion Gate implementation yet;
- no unrelated dependency upgrades;
- no real-account or irreversible production actions for initial baselines;
- no reuse of one tested-agent conversation across multiple formal trials.

## Next phases

1. run formal baseline trials without Completion Gate (18 valid trials, blinded fresh sessions);
2. measure false-success rate and time-to-verified-completion;
3. implement the minimum Completion Gate;
4. run controlled comparison with all other variables held constant.
