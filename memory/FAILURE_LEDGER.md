# Failure Ledger

A blameless record of what went wrong and what the studio learned, so no agent
repeats a mistake another agent already made. Logging a failure is a
contribution, not a confession: describe the system, never judge who did it.

## Rules

- **Read first.** Search this file before starting work.
- **Four lines per entry**, newest first, logged the same day.
- **Under 150 lines.** `cycle-retro` moves old or promoted entries, unchanged,
  to `memory/archive/`. Nothing is deleted; a wrong entry gets a dated correction.
- **No personal data or secrets.** No tester names, emails, or anything about a child.
- A lesson that keeps holding becomes a candidate in `HUMAN_HEURISTICS.md`.

## Entry format

```
### F-YYYYMMDD-NN · Product · short title
- Tried: the goal and the approach
- Happened: the observed result, how it was caught, who it affected
- Cause: the gap in the system (missing check, unclear rule, wrong assumption)
- Lesson: one sentence another agent can act on → change made, with link [open|guarded|promoted]
```

Status: `open` (no guard yet), `guarded` (a check now prevents it),
`promoted` (now a heuristic).

## Entries

No entries yet.
