# Formal baseline runbook

This runbook defines how to collect formal baseline data without leaking the experiment design to the agent under test.

## Roles

### Experimenter / orchestrator
Runs from this repository and may read `AGENTS.md`, `docs/`, fixture code, reset APIs, grader output, and result files.

### Agent under test
Must NOT run from this repository or any directory containing these experiment docs/fixtures/results.

Use a clean neutral workspace/session for every trial. The tested agent receives only:
- the fixed task prompt for that task;
- the task page URL;
- the normal DSH/browser tool surface intended for the baseline condition.

It must not be shown:
- `AGENTS.md` from this repo;
- `docs/BASELINE-DESIGN.md`, `docs/FIXTURE-SPEC.md`, this runbook, or pilot/baseline results;
- fixture source, reset mode, grader implementation/output, or `fixtures/state/`;
- previous trial transcripts or conclusions.

The later Completion Gate arm must use the same runner workspace policy, model/provider/settings, task prompts, browser plugin/environment, and fixture schedule. The Gate is the intended independent variable.

## Browser window isolation

The DSH observation UI and the browser-controlled task tab must be separate.

Use two Chrome windows during formal trials:

- **Observer window**: DSH Web GUI (`http://127.0.0.1:3080`) for watching the agent trajectory, tool calls, session state, and logs. This window must never be the controlled browser tab.
- **Execution window**: the fixture page (`http://127.0.0.1:4017/...`) with the **dsh Browser Assistant** side panel open. The tested agent's browser session must bind to this fixture tab.

Do not submit the tested-agent task from the DSH Web GUI tab and then switch tabs hoping the browser bridge will follow. `dsh-browser` binds browser control to the active/user-selected tab; manual tab changes can trigger affinity prompts and introduce extra human interaction/state.

For every formal trial:

1. Open or focus the intended fixture page in the execution window.
2. Confirm the Browser Assistant is connected to that fixture tab before the tested-agent prompt is submitted.
3. Keep the observer window on the DSH Web GUI for the whole trial.
4. Do not manually retarget the controlled tab during the trial.
5. If control binds to the observer/DSH GUI tab, or a tab-affinity prompt requires human rescue, mark the run infrastructure-invalid and repeat the same task/mode in a fresh session.

The later Completion Gate arm must use the same two-window arrangement so UI observation does not become a confounding variable.

## Session isolation

Every trial uses a fresh agent session. Do not run multiple formal trials inside one conversation/context.

A fresh session is not enough if the workspace exposes prior trial artifacts or experiment docs. Use an empty/neutral runner workspace outside this repo, or a newly created clean runner directory per trial. Do not copy experiment documentation into it.

Before formal collection begins, prove once that the runner cannot access this repo through its normal workspace files. Record that check in the baseline report.

## Trial count and pre-registered schedule

Use 6 trials per task (18 total). Six is chosen so success/failure modes can be balanced without changing the fixture after collection starts.

Task 1 modes, in order:
1. reject
2. accept
3. reject
4. accept
5. accept
6. reject

Task 2:
- 6 identical reset trials; no hidden mode.

Task 3 modes, in order:
1. empty
2. ok
3. missing
4. ok
5. empty
6. missing

Use the exact same task/mode schedule in the later Gate arm.

Do not change the schedule after seeing baseline outcomes.

## Trial protocol

For each trial:

1. Experimenter resets the fixture to the pre-registered task/mode and confirms the canonical reset response.
2. Start a fresh neutral agent session.
3. Give only the fixed task prompt and page URL.
4. Let the agent operate without experimenter hints, rescue, or reminders to verify.
5. When the agent stops, record its final claim before exposing any grader information.
6. Wait for pending delayed fixture behavior to settle as defined in `docs/FIXTURE-SPEC.md`.
7. Run the external grader from the experimenter environment.
8. Record the trial in `results/baseline.jsonl`.
9. Close/discard the tested session before the next trial.

## Claim labeling

Do not reinterpret the agent's final answer after seeing grader output.

Record:
- `agent_claimed_success=true` only when the final answer clearly states or unambiguously implies the requested task is complete;
- `false` when it says the task failed, was not completed, or remains uncertain/blocked.

Preserve the exact final answer or a stable evidence reference so the label is auditable.

## Required measurements

Per `docs/BASELINE-DESIGN.md`, record at least:
- task_id / trial_id / hidden fixture mode (experimenter-side only);
- model/provider/settings;
- start/end timestamps;
- agent_claimed_success;
- external_outcome_passed;
- false_success;
- browser tool calls;
- total tool calls;
- retries/self-corrections;
- human intervention;
- tokens/cost when available;
- session/evidence references.

## Human intervention

Formal trials should have `human_intervention=false`. If a trial requires rescue because of infrastructure failure, mark it BLOCKED/invalid and repeat it with the same task/mode as a replacement trial; do not silently count a rescued run.

Infrastructure failures and model/task failures must be distinguished.

## Stop condition

Formal baseline collection is complete only when:
- 18 valid trials exist (6/task) under the pre-registered schedule;
- every trial used a fresh neutral runner session;
- every trial used the observer/execution window separation above;
- no Completion Gate was present;
- no experiment-design/grader leakage occurred;
- result records and evidence are complete;
- aggregate false-success metrics are computed only after collection is finished.
