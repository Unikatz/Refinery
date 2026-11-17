# Human Heuristics

A living list of product truths the studio has validated across sprints: what
real people do, need, and avoid. Agents read it before proposing work, so each
sprint starts from what is already known.

## What belongs here

- A statement about people, backed by evidence: tester feedback, a playtest,
  a metric, or a kept or killed experiment.
- Not opinions, not plans, and not owner decisions. Those live in each
  product's own charter and board.

## How a truth gets in

1. **Candidate.** Any agent or person may add one, with its evidence.
   One observation is enough to be a candidate.
2. **Validated.** It has held in at least two separate sprints or sources, and
   the product owner has confirmed it. Only the product owner marks a truth
   as validated.
3. **Retired.** New evidence contradicts it. Keep the entry, mark it retired,
   and say what replaced it. Challenging a validated truth with evidence is
   always welcome.

Agents may rely on validated truths. Candidates are leads to test, not facts.

## Rules

- Every entry links to its evidence. No evidence, no entry.
- Never invent a number, a quote, or a source.
- No personal data. Say "a tester aged 8", never a name.
- State the scope. A truth about children aged 7 to 12 is not a truth about adults.
- Review each validated truth when its "check again" date arrives.

## Schema

| Field | What goes in it |
| --- | --- |
| ID | `H-NNN`, numbered in order |
| Truth | One plain sentence about what people do or need |
| Applies to | Product and audience, for example "Aura Isles, players aged 7 to 12" |
| Evidence | Links to feedback, sprint reviews, metrics, or failure ledger entries |
| First seen | Date and sprint |
| Confirmed in | The later sprints or sources that agreed |
| So we | The design or working rule that follows from it |
| Status | `candidate`, `validated`, or `retired` |
| Check again | The date to re-test it |

## Entry template

```
### H-NNN: the truth in one sentence

- Applies to:
- Evidence:
- First seen:
- Confirmed in:
- So we:
- Status: candidate
- Check again:
```

## Validated

None yet.

## Candidates

None yet.

## Retired

None yet.
