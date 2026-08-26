# VERIFY — evidence rules

Agent statements are not completion evidence.

## Evidence priority

1. actual outcome / executable test / real browser state
2. tool execution result
3. runtime/log/git diff evidence
4. agent explanation

## Reporting

If a required verification has not actually run, report FAIL or BLOCKED,
not PASS.

## Repository work

For repository work, a local commit is not completion evidence.

Before substantial work:
- fetch/reconcile the authoritative remote branch;
- do not silently work from a stale or diverged local branch.

PASS requires:
- the intended state exists on the authoritative remote branch;
- the relevant local commit/state is reachable from that remote branch;
- local HEAD and remote state are reconciled, or any intentional divergence is explicitly reported;
- no unexplained local changes remain.

If push or remote verification has not completed, report BLOCKED rather than PASS.

## Dependency work PASS criteria

PASS for dependency work requires:

- exact dependency commit recorded;
- no unexplained local diff;
- successful build;
- relevant tests passing;
- required browser actions verified after any necessary human restart.

## Browser experiment evidence

For browser experiments, clicking an action is not proof that the task outcome occurred.
Record the externally observable final state separately from the agent's own completion claim.

A false success is: the agent reports the task complete while the external outcome check fails.