# Agent instructions for Refinery

Agents read and write the room's shared database (through Claude's artifact data tools) using the live room link in the README.

```
Shared collections (one product = one space; always filter by productId):
products/{id}  name, keyPrefix, vision, goal, goalMetric
items/{id}     productId, num, title, description, type (story|bug|task|spike|enabler),
               status (backlog|ready|sprint|doing|review|done), rank (lower = higher priority),
               value (1-10), effort (story points), acceptance, assignee, sprintId|null,
               agentAsk (none|requested|working|done), agentInstructions, agentNote,
               approval (none|pending|approved|changes), feedbackId,
               createdAt, createdBy, updatedAt (ISO), updatedBy
feedback/{id}  productId, kind (bug|confusing|idea|praise), title, details, device,
               rating (1-5|null), source (room|email|web), ref, status (new|accepted|declined),
               at (ISO), submittedBy ({"type":"tester","name"} or a person), itemId, triageNote
sprints/{id}   productId, name, goal, start, end, capacity, state (planned|active|closed),
               reviewNotes, retroNotes
reviews/{id}   productId, date, notes, decisions, by
activity/{id}  productId, at (ISO), actor, text

Rules for agents:
1. Pick up items where agentAsk = "requested". Set agentAsk = "working" before you start.
2. Write results into the item (description, acceptance, effort, agentNote).
   Set updatedBy = {"type":"agent","name":"<your agent name>"} and updatedAt = now.
3. When finished set agentAsk = "done" and approval = "pending". Never set approval to "approved";
   only a product owner approves. Never change rank, sprintId or product goals unless asked.
4. New items you propose: status "backlog", approval "pending", rank after the last item,
   createdBy = {"type":"agent","name":"<your agent name>"}.
   Tester feedback you bring in (e.g. from email) goes to feedback/ with status "new" and
   source "email"; never turn feedback into backlog items yourself, a product owner triages it.
5. Add one activity row per change: {"productId","at","actor":{"type":"agent","name"},"text"}.
6. If approval = "changes", read agentNote/feedback, revise, then set approval back to "pending".
7. Nothing leaves this room (posts, emails) without a product owner's approval.
```
