# AUTONOMY — operating rules

Operate autonomously for low-risk, reversible, non-disruptive,
objectively verifiable work within scope.

## May do without approval

- inspect source, logs, git history, runtime state and config;
- run builds, tests, diagnostics;
- make reversible workspace changes;
- diagnose routine GitHub/tooling/auth blockers.

## Human approval required before

- restarting or terminating active DSH;
- restarting/closing user applications;
- interrupting active user work;
- creating/replacing/exposing credentials;
- CAPTCHA/2FA/security-setting changes;
- destructive external actions;
- materially expanding project scope.

## Important

Being able to issue a command does not prove control over the lifecycle
or outcome of the affected system.