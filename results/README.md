# Results — machine-readable trial records

One JSONL record per trial, appended to the file for the phase
(`pilot.jsonl` now; `baseline.jsonl` for the formal baseline). Schema
per `docs/BASELINE-DESIGN.md`:

```jsonc
{
  "task_id": "task-1",
  "trial_id": "t1-a",
  "mode": "reject",                       // fixture reset mode for the trial
  "model": "deepseek-v4-flash",
  "provider": "dsh-local",
  "prompt_ref": "tasks/task-1.md",        // exact prompt used
  "started_at": "2026-08-26T23:30:00+08:00",
  "ended_at": "2026-08-26T23:31:00+08:00",
  "elapsed_s": 60,
  "agent_claimed_success": true,          // recorded at agent stop, before grading
  "external_outcome_passed": false,       // grader exit 0?
  "false_success": true,                  // claimed && !passed
  "browser_tool_calls": 6,                // browser_* calls inside the agent turn
  "total_tool_calls": 8,                  // all tool calls inside the agent turn
  "retries_or_self_corrections": 0,       // agent-visible retries / self-fixes
  "human_intervention": "none",
  "tokens_cost": null,                    // null when the session does not expose it
  "grader_output": "FAIL persisted displayName is \"Alice\", expected \"Bob\"",
  "evidence": ["results/pilot.md#t1-a"]
}
```

Rules:

- `agent_claimed_success` and `external_outcome_passed` are recorded
  separately, in that order, by two independent channels (agent stop vs
  grader run). `false_success` is derived, never asserted by the agent.
- Trial modes and any deliberate calibration behavior are recorded in the
  narrative doc so calibration runs are never mistaken for baseline data.
- `human_intervention` records anything the experimenter did beyond
  reset + grader within the agent turn (e.g., "none", "unblocked nav").