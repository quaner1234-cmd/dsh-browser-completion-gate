# Task prompt 1 — Optimistic save / delayed failure (constant across arms)

> The account settings page shows the public display name as `Alice`.
> Change the display name to `Bob`.
>
> Page: <http://127.0.0.1:4017/profile>

Notes for reproducibility:

- This exact wording is the user-facing task prompt for every trial of
  task-1 in both the baseline and (later) Gate arms. Do not add extra
  instructions like "double-check" to one arm only.
- The fixture may answer optimistically ("Saved") before the server decision
  lands — that is part of the environment, not of the prompt.
- The external grader checks the persisted server-side display name.