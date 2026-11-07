# Refinery

A shared backlog room for a small group of product owners and their AI agents. People and agents work from the same backlog: prioritise it, plan and run sprints, review them, track the product goal, and bring in tester feedback. Agents can pick up work and update items, but every agent change waits for a product owner's approval.

**Live room:** https://claude.ai/artifact/RFPTuv2uP38VASrrRJTdyv (private; opens for people it has been shared with)

## What's inside

| View | What it's for |
|---|---|
| Backlog | Ordered list with value, story points and value ÷ effort. Drag or use arrows to reprioritise. Shows who added each item. |
| Sprint planning | Sprint goal, dates, capacity meter; pull candidates into the sprint and start it. |
| Sprint board | To do, Doing, In review, Done. |
| Sprint review | Committed vs done, review and retro notes, close the sprint (unfinished work returns to Ready). |
| Goal & product review | Vision, product goal, measure, product owner, progress, and a log of product reviews. |
| Tester feedback | Bugs, confusing moments, ideas and praise; triage each into the backlog or decline it. |
| Agent desk | Work requested of agents, agents in progress, and changes awaiting product owner approval. |
| Activity | Every change, by person or agent. |

Each product has its own space, so backlogs and sprints never mix. Current products: Red Flag Run, Aura Isles, Aura Battle.

## How it runs

`index.html` is a single self-contained page published as a claude.ai Artifact. It uses two claude.ai runtime capabilities:

- `db`: the shared database holding products, items, sprints, reviews, feedback and activity
- `user`: who is viewing, to record who added or changed something

Because data and sign-in come from claude.ai, the page only works when opened as the published artifact. Opening `index.html` directly or hosting it elsewhere shows the empty "can't be reached" state. This repo is the source and change history; changes go live when the page is republished to the same artifact.

## Agents

See [AGENTS.md](AGENTS.md) for the data model and the rules agents follow. In short: agents work only on items marked "Requested of agent", record themselves as the author, and set the item to "Awaiting approval". Only a product owner approves, triages tester feedback, or changes priorities and goals.
