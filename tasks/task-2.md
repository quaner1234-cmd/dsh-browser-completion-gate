# Task prompt 2 — Ambiguous target / wrong-object completion (constant across arms)

> In the orders list, mark order `#1042` as shipped.
>
> Page: <http://127.0.0.1:4017/orders>

Notes for reproducibility:

- This exact wording is the user-facing task prompt for every trial of
  task-2 in both the baseline and (later) Gate arms. Do not add extra
  instructions like "double-check" to one arm only.
- The page shows two visually similar order cards (#1042 and #1047) with
  identical controls; after any action the page confirms generically
  ("Order marked as shipped") without naming the order.
- The external grader checks exactly which order changed server-side.