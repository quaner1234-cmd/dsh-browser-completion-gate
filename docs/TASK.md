# TASK — Browser Completion Gate for DSH

## Current phase

MVP frozen — v0.1.0 release candidate.

Clean-session acceptance passed and is recorded in `docs/ACCEPTANCE-clean-session.md`.

The plugin is usable now:

- `completion_gate_check` returns deterministic PASS / FAIL / BLOCKED receipts;
- file, JSON-state, and browser conditions are supported;
- `conditionsPath` provides a user-editable condition definition path;
- the narrow per-agent tool guard works within the current DSH API limits;
- the README documents activation, examples, and the hard limitation that DSH cannot veto a model turn that ends without any tool call.

## Immediate task — publish v0.1.0

This is release hygiene only. Do not change plugin code or behavior.

Do exactly this:

1. `git fetch origin` and verify the local repository is clean.
2. Verify `origin/main` contains the accepted MVP and that `prototype/minimum-completion-gate` has no unmerged product changes that should be part of v0.1.0.
3. Check whether tag `v0.1.0` already exists locally or remotely. If it already exists, do not overwrite it; report and stop.
4. Check out/sync `main` to `origin/main` without rewriting history.
5. Create an annotated tag on the exact accepted `main` HEAD:
   `v0.1.0` with message `Completion Gate v0.1.0`.
6. Push only that tag to origin.
7. Verify the remote tag resolves to the same commit as the accepted `main` HEAD.
8. If the already-installed/authenticated GitHub CLI (`gh`) is available, create a GitHub Release from `v0.1.0` with title `Completion Gate v0.1.0` and concise notes covering:
   - deterministic PASS / FAIL / BLOCKED receipts;
   - file, JSON-state, and browser completion conditions;
   - user-editable `conditionsPath`;
   - optional per-agent deny-tools guard;
   - no new browser automation; browser checks reuse dsh-browser;
   - known limitation: current DSH cannot veto a model turn that ends with no tool call;
   - installation/activation instructions are in `gate/README.md`.
9. If `gh` is unavailable or unauthenticated, do NOT install/configure/authenticate anything. Stop after the tag is verified and report the exact GitHub UI step needed to create the Release manually.
10. Report the final `main` SHA, tag target SHA, whether the GitHub Release was created, and the release URL if available.

## Definition of DONE

DONE means the immutable `v0.1.0` tag exists on GitHub and points to the accepted `main` commit. A GitHub Release page should also exist if it can be created with already-available authenticated tooling; otherwise the tag alone completes the repository-side release and the remaining UI action is reported.

## Not authorized

- no plugin code changes;
- no experiments;
- no new tests beyond a repository-state check;
- no dependency changes;
- no branch-history rewrites or force pushes;
- no tag overwrite;
- no installing/configuring/authenticating `gh` or other tools;
- no feature expansion.

After release hygiene, STOP.
