# Experiment V0 — archived discovery experiment

Status: **historical evidence; not active instructions**.

## Environment

V0 used the older frozen dsh-browser base around `a817c30…` plus the documented local schema-normalization delta.

## What V0 established

- Formal blinded baseline: 18 trials, 6 per task.
- Agent claimed success in 15/18 trials.
- Independent outcome evaluator passed 11/18.
- False success: **4/18**, all four in task-3 deceptive download modes (`empty` / `missing`).
- Task-1 reject modes produced 0/3 false success.
- Task-2 produced 0/6 false success.

Authoritative records:
- `results/baseline.jsonl`
- `results/baseline.md`
- `docs/BASELINE-DESIGN.md`
- `docs/BASELINE-RUNBOOK.md`

## Gate calibration discovery

A minimum external Gate checker/interception loop was implemented and calibrated. During calibration, the browser environment exposed a separate infrastructure problem: after DSH/browser lifecycle changes, a tested child could bind to or observe the DSH GUI/observer tab instead of remaining isolated on the fixture tab. That leaked experiment information and invalidated formal Gate-arm collection under this environment.

## Why V0 stopped

Upstream investigation showed that the frozen V0 browser state predates the later controlled-tab, background-affinity, and per-session tab-affinity work added to dsh-browser. The project therefore does not continue the formal Gate arm on the V0 browser environment.

V0 results remain valid as discovery evidence. They must not be overwritten or relabeled as V1 results.
