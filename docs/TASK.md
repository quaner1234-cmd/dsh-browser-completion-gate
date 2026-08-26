# TASK — Browser Completion Gate for DSH

## Current goal

Build and evaluate whether an explicit external Browser Completion Gate reduces
false-success outcomes compared with agent self-judgment.

## Current phase

Stabilize and freeze dsh-browser before baseline experiments.

## Immediate task

Put dsh-browser into a reproducible upstream state containing the official
tool-schema normalization fix, then verify parameterized browser tools end-to-end.

## Non-goals

- no browser automation replacement;
- no dsh-browser redesign;
- no unrelated features;
- no Completion Gate implementation yet;
- no unrelated dependency upgrades.

## Next phases

1. freeze browser environment;
2. design three baseline tasks;
3. measure false success / time-to-verified-completion;
4. implement minimum Completion Gate;
5. run controlled comparison.