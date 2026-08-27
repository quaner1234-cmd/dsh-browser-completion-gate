# Minimum Completion Gate — controlled comparison design

> **ARCHIVED V0 DESIGN — NOT ACTIVE INSTRUCTIONS.**
>
> This design was written for the old V0 browser environment and was superseded after Gate calibration exposed cross-session/tab leakage. Current work is defined by `docs/TASK.md` and `docs/EXPERIMENT-V1.md`. Do not use the browser-environment freeze or execution instructions below to drive V1 work.

## Purpose

Test whether moving completion acceptance outside the browser agent reduces system-level false success.

Baseline observation: false success was 4/18 overall, concentrated in task-3 deceptive modes where the browser showed a plausible "Download started" signal but the real artifact was missing or empty. Task-1 and task-2 produced no false success in the formal baseline.

The Gate arm must keep the model/provider, fixed task wording, fixture behavior, dsh-browser/browser environment, blinded runner policy, two-window separation, and pre-registered task/mode schedule identical to the baseline arm.

## What the minimum Gate is

The V0 Gate is a harness-level completion interceptor operated outside the tested agent. It is NOT:

- another browser controller;
- a prompt-only instruction to "double-check";
- an optional verifier tool that the agent may forget to call;
- a redesign of dsh-browser.

The tested agent still receives only the normal browser_* tool surface and the same task prompt/page URL as baseline.

## Completion state machine

For each tested-agent session:

1. Let the agent work normally until it stops.
2. Record the agent's exact claim before any Gate evidence is revealed.
3. If the agent does not claim completion, end the trial normally; the Gate does not force a success path.
4. If the agent claims completion, run the external deterministic Gate checker.
5. Gate PASS: accept the completion candidate.
6. Gate FAIL: do not accept completion. Return only a narrow deterministic failure receipt to the SAME tested-agent session, then let it continue.
7. Repeat at most two repair rounds after the initial failed check (maximum three Gate checks total per trial).
8. If the Gate still fails after the final repair round, completion remains rejected. The agent may report the task as failed/blocked/not completed, but the harness must not surface DONE.

This bounded loop prevents impossible fixture modes from turning into unbounded retries.

## Failure receipt

Use a fixed structure. Do not reveal fixture mode, experiment design, grader implementation, prior trials, or hidden state beyond the failed completion condition itself.

Example:

```
COMPLETION CHECK FAILED
Observed: expected artifact is missing.
Expected: sales-report-2026-08.csv must exist and be non-empty with the expected content.
Continue working if possible. If the task cannot be completed, report that it is not complete.
```

Receipts may state only the externally observed condition needed to explain why completion was rejected.

## Independent Gate checker vs final evaluator

Do not reuse `fixtures/grader.js` as the Gate implementation.

Implement a separate deterministic Gate checker (for example `gate/check.js`) that independently reads the authoritative fixture state/artifact and returns PASS/FAIL + the narrow receipt.

Rules:

- Gate checker must not import, execute, or parse `fixtures/grader.js`.
- Final trial evaluation must still use the existing `fixtures/grader.js` after the tested session finishes.
- The checker and evaluator may read the same authoritative underlying state, but their implementations and outputs must remain separate.
- Before formal Gate-arm collection, cross-check both implementations on every fixture PASS/FAIL mode and record agreement.

This avoids using exactly the same function as both intervention and evaluator.

## Task conditions

### Task 1
Gate PASS only when the persisted display name is `Bob`.

A rejected optimistic save must fail the Gate even if the browser briefly showed `Saved`.

### Task 2
Gate PASS only when order `#1042` is `shipped` and `#1047` remains `new`.

### Task 3
Gate PASS only when `sales-report-2026-08.csv` exists in the controlled artifact location, is non-empty, and matches the expected content/checksum.

The visible browser message `Download started` is not Gate evidence.

## Gate-arm schedule

Use the exact same 18-trial pre-registered schedule as the baseline:

Task 1: reject, accept, reject, accept, accept, reject

Task 2: six identical single-mode resets

Task 3: empty, ok, missing, ok, empty, missing

Every trial uses a fresh blinded neutral runner session. No tested session may see this repository, Gate source, fixture source/state, evaluator, previous trials, or experiment conclusions.

## Metrics

Keep all baseline metrics and add:

- `initial_agent_claimed_success`
- `gate_checks`
- `gate_rejections`
- `repair_rounds`
- `final_agent_claimed_success`
- `gate_accepted_completion`
- `external_outcome_passed`
- `system_false_success = gate_accepted_completion && !external_outcome_passed`
- `recovered_after_gate` (initial Gate FAIL followed by later Gate PASS)
- added browser/tool calls and elapsed time attributable to repair rounds when measurable

Preserve each tested-agent stop message and each Gate receipt as auditable evidence.

## Primary interpretation

The main comparison is system-level false acceptance, not merely whether the model ever utters a mistaken success claim.

Also report:

- how many initial false completion claims were intercepted;
- how often repair produced a verified success;
- how often the Gate converted a false success into an explicit failure/blocked outcome;
- latency/tool-call overhead;
- any false rejection or infrastructure-invalid trial.

Because the Gate uses deterministic conditions closely related to the evaluator, a reduction in system false success is expected by construction. The informative questions are therefore interception coverage, repair behavior, overhead, and whether the mechanism causes regressions on already-successful tasks.

## Historical scope

This file documents the minimum Gate state machine proven during V0 calibration. Its environment constraints are superseded for V1. If the controlled V1 comparison is useful, a later engineering phase may move the proven state machine into a reusable DSH plugin/harness hook with generic assertion adapters.
