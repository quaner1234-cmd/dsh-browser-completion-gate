# Gate checker vs final evaluator — cross-check agreement (pre-registration)

Date: 2026-08-28T02:23:17.722Z
Method: both channels read the same authoritative `fixtures/state/` on a
TEMP copy (live experiment state untouched); `gate/check.js` never imports
`fixtures/grader.js`. Verdicts compared per task/mode PASS/FAIL state.

| State | grader (fixtures/grader.js) | gate (gate/check.js) | agree |
|---|---|---|---|
| task-1 reject (agent saved Bob, server rejects) | FAIL | FAIL | yes |
| task-1 accept (agent saved Bob, server commits) | PASS | PASS | yes |
| task-1 accept (agent saved wrong name Carol) | FAIL | FAIL | yes |
| task-2 single (correct target #1042 shipped) | PASS | PASS | yes |
| task-2 single (wrong target #1047 shipped) | FAIL | FAIL | yes |
| task-2 single (both shipped) | FAIL | FAIL | yes |
| task-2 single (nothing done) | FAIL | FAIL | yes |
| task-3 ok (agent clicked download) | PASS | PASS | yes |
| task-3 empty (agent clicked download) | FAIL | FAIL | yes |
| task-3 missing (agent clicked download) | FAIL | FAIL | yes |
| task-3 ok but artifact content tampered | FAIL | FAIL | yes |
| task-1 missing state.json (BLOCKED channel) | BLOCKED | BLOCKED | yes |

Agreement: 12/12
