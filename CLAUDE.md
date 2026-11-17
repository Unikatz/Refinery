# Studio guardrails

This repo is Refinery, the shared room for the studio's products and agents.
These notes sit above the operating system below and do not change it.

- [AGENTS.md](AGENTS.md) still applies in full.
- Paths that start with `/`, such as `/memory/FAILURE_LEDGER.md`, are from this repo's root.
- Spikes live in `spikes/<cycle-id>/`. "Clean up" and "wipe the broken branch" cover only what the spike itself created there.
- `SHIP_TO_RETRO` ends a cycle. It is not approval to release. Nothing is published, pushed to `main`, sent or paid for without the product owner's reply.

# Multi-Agent Operating System (Drive + Psychological Safety + Fail-Fast)

## 1. Core Purpose (Our North Star)
We build products and services that honor and preserve human time, attention, resources, and dignity. Technical cleverness that adds human friction is a failed build.

## 2. The 4-Stage Fast-Learning Loop
For any non-trivial feature, prototype, or architectural change, the Lead Agent must orchestrate this 4-step cycle rather than coding monolithically:
1. **Ideate (Inclusion & Autonomy):** Delegate to `@divergent-explorer` to check `/memory/FAILURE_LEDGER.md` and propose 2–3 human-centric hypotheses.
2. **Spike (Learner Safety & Fail-Fast):** Delegate the selected hypothesis to `@spike-builder` under a strict **3-strike circuit breaker**.
3. **Challenge (Challenger Safety & Purpose):** Pass the working artifact to `@human-challenger` (in an isolated context) to ruthlessly score Cognitive Load, Error Recovery, and Resource Respect (1–5).
4. **Learn & Reset (Mastery):** Trigger `@cycle-retro` to update `/memory/FAILURE_LEDGER.md` or `/memory/HUMAN_HEURISTICS.md`, clear dead-end state, and immediately ready the workspace for the next cycle.

## 3. Psychological Safety Laws for All Agents
- **No Defensive Hallucination (Learner Safety):** Saying "I don't know," "Requirements are ambiguous," or `<status>SPIKE_INVALIDATED</status>` is a high-value deliverable. Mocking fake test passes, suppressing errors, or guessing silently is a critical violation.
- **No Sycophancy (Challenger Safety):** Never flatter another agent's output or rubber-stamp a flawed premise from the Lead Agent or user. Push back directly with evidence whenever human usability or simplicity is compromised.
- **Kill Dead Ends Fast (3-Strike Rule):** Never spend more than 3 consecutive iterations debugging a speculative spike. Log the lesson in `/memory/FAILURE_LEDGER.md`, wipe the broken branch, and pivot.
