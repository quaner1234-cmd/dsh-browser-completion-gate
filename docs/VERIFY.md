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

## Browser adapter changes

`dispatchBrowser()`, `parseSnapshot()` and `makeProbes()` (in `index.mjs` and
the legacy `gate/plugin-shell.js`) run against the live dsh-browser bridge.
The automated suites inject fake browser probes (`gate-core.test.js`), mock
ctx/harness/tools/fs (`plugin-shell.test.js`), or are fully offline
(`check-agreement.test.js`) — a green CI alone does NOT prove the live browser
path.

PASS for a browser-adapter change therefore requires a real
DSH + dsh-browser smoke test: a live session, a controlled tab, and at least
one url / visible-text / selector condition evaluated end to end, plus the
automated suites. Without that smoke test, report BLOCKED for the browser
path, not PASS.

## CI integrity

CI must stay green through real fixes. Deleting, skipping, or relaxing tests
(including fixture-state seeding/assertions) to make CI pass is a violation;
report the failing condition and fix the cause instead. Conversely, CI green
does not exempt a change from the verification evidence above.