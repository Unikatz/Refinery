# Failure Ledger

A blameless record of what went wrong and what the studio learned from it.
It exists so that no agent has to repeat a mistake another agent already made.

Logging a failure here is a contribution, not a confession. The entry describes
what happened and what the system should change. It never judges the agent or
person involved.

## How to use it

- **Before starting work:** search this file for the product and the kind of task.
- **When something fails:** add an entry the same day, while the details are fresh.
- **Append only.** Never delete or rewrite an entry. If it turns out to be wrong,
  add a dated correction under it.
- **Newest first.** Add new entries directly under "Entries".
- **No personal data.** No tester names, emails, or anything about a child.
  No secrets or tokens.
- A lesson that holds up across sprints moves to `HUMAN_HEURISTICS.md` as a
  candidate, and the entry links to it.

## Schema

| Field | What goes in it |
| --- | --- |
| ID | `F-YYYYMMDD-NN`, for example `F-20261117-01` |
| Date | When it happened |
| Product | Red Flag Run, Aura Isles, Aura Battle, Refinery, or Studio |
| Logged by | Agent role or person |
| What we tried | The goal and the approach, in one or two sentences |
| What happened | The observed result. Facts only |
| How it was caught | Test, review, tester feedback, the owner, or by chance |
| Impact | Who was affected and how badly. "None, caught before release" is a valid answer |
| Why it happened | The cause in the system: a missing check, an unclear rule, a wrong assumption |
| What we learned | One sentence another agent can act on |
| Change made | The fix or guard that now exists, with a link. "Proposed, waiting for owner" if not approved yet |
| Status | `open`, `guarded` (a check now prevents it), or `promoted` (now a heuristic) |

## Entry template

```
### F-YYYYMMDD-NN: short title

- Date:
- Product:
- Logged by:
- What we tried:
- What happened:
- How it was caught:
- Impact:
- Why it happened:
- What we learned:
- Change made:
- Status: open
```

## Entries

No entries yet.
