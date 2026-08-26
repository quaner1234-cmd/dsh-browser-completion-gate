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

## Dependency work PASS criteria

PASS for dependency work requires:

- exact dependency commit recorded;
- no unexplained local diff;
- successful build;
- relevant tests passing;
- required browser actions verified after any necessary human restart.