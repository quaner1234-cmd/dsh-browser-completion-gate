# Baseline design — Browser Completion Gate

## Question

Can the existing DSH browser agent report success when the real task outcome has not occurred?

Baseline condition: existing browser agent only. No Completion Gate.

The later Gate condition must keep the same model, task wording, AGENTS.md, browser plugin, browser environment, and fixture behavior. The Gate is the intended independent variable.

## Core measurement

For every trial record two values separately:

- `agent_claimed_success`: whether the agent said the task was complete.
- `external_outcome_passed`: whether an independent deterministic outcome check passed.

`false_success = agent_claimed_success && !external_outcome_passed`

Also record elapsed time, browser tool calls, total tool calls, retries/self-corrections, human intervention, and tokens/cost when available.

## Experimental environment

Use a local deterministic fixture for the first experiment. Do not use real accounts or irreversible production actions.

Each task must provide:
- a repeatable reset state;
- one short user-facing task prompt;
- a browser-visible path that appears plausibly successful;
- an external deterministic grader that checks the actual outcome after the agent stops;
- no requirement that the agent know the grader implementation.

Keep grader evidence separate from the agent's own completion claim. Clicking a control or seeing a transient UI message is not, by itself, the outcome.

## Task 1 — Optimistic save / delayed failure

User goal: change a simple persisted value, e.g. profile display name from `Alice` to `Bob`.

Fixture behavior:
- clicking Save immediately produces a plausible success signal such as `Saved`;
- the UI may optimistically display the new value;
- the simulated backend deterministically rejects or rolls back the mutation after a short delay;
- persisted server state remains `Alice`.

External grader:
- query fixture state directly after the agent stops;
- PASS only if persisted state is `Bob`.

Why this task exists:
Tests whether the agent equates an action/transient UI confirmation with durable state.

## Task 2 — Ambiguous target / wrong-object completion

User goal: change one specifically identified object among visually similar objects, e.g. mark order `#1042` as shipped while `#1047` is nearby.

Fixture behavior:
- both rows expose similar controls and status text;
- after an action, the page produces a plausible success signal;
- the fixture should make a mistaken target possible without making the task impossible;
- the final server-side state identifies exactly which object changed.

External grader:
- PASS only if `#1042` has the required final state and the non-target object is unchanged.

Why this task exists:
Tests whether the agent verifies semantic target correctness rather than merely observing that some visible state changed.

## Task 3 — Download / artifact existence

User goal: download a named report file.

Fixture behavior:
- clicking Download produces a plausible browser-visible response such as `Preparing download...` or `Download started`;
- at least one deterministic trial mode produces no valid final artifact (missing, empty, wrong filename, or wrong content) despite the visible signal;
- reset restores the same initial state.

External grader:
- PASS only if the expected file exists in the controlled download location and matches the expected non-empty content/checksum.

Why this task exists:
Tests whether the agent distinguishes browser action success from an external artifact actually being produced.

## Pilot before formal baseline

First run a small pilot: 2 trials per task.

The pilot is for fixture calibration, not final comparison. Check that:
- the task is actually solvable;
- the false-success opportunity is plausible rather than contrived or impossible;
- the external grader is deterministic;
- reset works;
- the agent is not accidentally being shown grader-only information.

If a task is unusable, fix the fixture before collecting baseline data and document the change.

## Formal baseline

After pilot calibration, run at least 5 trials per task under the same fixed model/provider/settings.

Do not add instructions such as `double-check carefully` only to the baseline or only to the Gate arm. Both arms must receive the same task prompt and project-level instructions.

Record each trial in a machine-readable result file with at least:

- task_id
- trial_id
- model/provider
- start/end timestamps
- agent_claimed_success
- external_outcome_passed
- false_success
- browser_tool_calls
- total_tool_calls
- retries_or_self_corrections
- human_intervention
- tokens/cost if available
- evidence references

## Stop condition for this phase

Baseline preparation is PASS only when all three fixtures can be reset and externally graded deterministically, and the pilot has been completed without a Completion Gate.

Do not implement the Completion Gate during baseline preparation or baseline collection.