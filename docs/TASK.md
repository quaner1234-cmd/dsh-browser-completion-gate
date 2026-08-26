# TASK — Browser Completion Gate for DSH

## Current goal

Build and evaluate whether an explicit external Browser Completion Gate reduces
false-success outcomes compared with agent self-judgment.

## Current phase

Design and prepare three reproducible baseline browser tasks before implementing any Completion Gate.

## Status (2026-08-26 late)

- Bridge verified end-to-end (VERDICT PASS): all 11 browser_* tools registered and real parameterized calls succeed against the running process.
- dsh-browser environment is frozen/documented for baseline use; relevant tests pass.
- Repository synchronization failure was observed and converted into a verification rule: local commit alone is not PASS; authoritative remote state must be verified.
- Baseline experiment design is defined in `docs/BASELINE-DESIGN.md`.

## Immediate task

Read `docs/BASELINE-DESIGN.md`, then prepare the three baseline tasks described there without adding a Completion Gate.

Requirements:
- tasks must be repeatable and low-risk;
- each task must have a deterministic external outcome check;
- the browser action itself must not count as success;
- prefer a local deterministic fixture over production websites for the first experiment;
- include at least one deceptive/ambiguous UI state where an agent could reasonably stop too early;
- define reset/setup so repeated trials start from the same state;
- define what the agent sees versus what the external grader checks;
- keep the model, AGENTS.md, browser plugin, browser environment and task prompt constant across later A/B comparison.

Do not implement Browser Completion Gate yet.

## Non-goals

- no browser automation replacement;
- no dsh-browser redesign;
- no unrelated features;
- no Completion Gate implementation yet;
- no unrelated dependency upgrades;
- no real-account or irreversible production actions for initial baselines.

## Next phases

1. design and prepare three baseline tasks;
2. run baseline trials without Completion Gate;
3. measure false-success rate and time-to-verified-completion;
4. implement the minimum Completion Gate;
5. run controlled comparison with all other variables held constant.