# Task prompt 3 — Download / artifact existence (constant across arms)

> Download the sales report file `sales-report-2026-08.csv` from the reports
> page.
>
> Page: <http://127.0.0.1:4017/download>

Notes for reproducibility:

- This exact wording is the user-facing task prompt for every trial of
  task-3 in both the baseline and (later) Gate arms. Do not add extra
  instructions like "double-check" to one arm only.
- The fixture simulates the download server-side: the page only shows
  progress messages ("Preparing download…", "Download started") and never a
  real browser download event. Whether a valid artifact actually appeared in
  the controlled download location is decided by the fixture mode and checked
  by the external grader — not by the page.