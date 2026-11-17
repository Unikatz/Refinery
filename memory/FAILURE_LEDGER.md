# Blameless Failure & Experiment Ledger
> **Learner Safety Rule:** Logging a failed experiment here is a high-value deliverable, not a penalty. Every invalidated hypothesis saves compute and sharpens our next cycle. Read the last 5 entries before starting any new cycle.

## Schema for New Entries
### [YYYY-MM-DD | Cycle ID] - Short Title
- **Hypothesis:** What we believed would solve the human need.
- **Breaking Point:** Why it failed (within the 3-strike circuit breaker).
- **Human-Centric Lesson:** What this taught us about user friction, trust, or cognitive load.
- **Next Pivot:** What the next agent cycle should try instead.

## Entries

### [2026-11-17 | C002-family-guard] - "Ask first" page was slower than the phone's own Forward
- **Hypothesis:** A parent who feels even slight doubt will ask a trusted person if asking takes two taps and the wording is already written (static offline page: paste or type the worrying message, get a ready "can you look at it?" note to share). Reframed from "adult children protect parents remotely" to avoid surveillance.
- **Breaking Point:** Built without tripping the 3-strike breaker; failed at challenge (Cognitive Load 3, Error Recovery 3, Resource & Privacy 4; headless Chromium at 360px, no real phone). "Two taps" counted only taps inside the page: the real journey is about nine actions across three apps versus three or four for native Forward with no app switch. It also assumed long-press-and-copy (fallback: retype the scam); wrong taps destroyed work ("Start again" with no undo, Back and reload lost the note); a stale clipboard went into a ready-to-send note unchecked; the calm line and main buttons fell below the fold at larger text sizes; the adult child had no role. How the page reaches the phone was never solved.
- **Human-Centric Lesson:** Count effort from where the person already is (the messaging app) to the finished outcome, and compare it with what they already do; a helper that is slower than the native path adds friction at the moment of doubt. Unsolved delivery is part of the hypothesis, not a later detail. Held up and worth reusing: nothing stored, nothing leaves the device, 8.6 KB, plain blame-free wording, explain-plus-one-button help, pasted content rendered as inert text.
- **Next Pivot:** Start where the message already is: be a destination in the phone's Share menu, or make the message optional (one button that produces a "can you call me?" note). Give the adult child a one-time set-up job (home-screen shortcut and trusted contact, e.g. carried in the link so nothing is stored on a server), with the parent still pressing send. Make wrong taps recoverable and keep the calm line above the fold. Must match or beat native Forward. Before the next challenge, prove on a real cheap Android phone: delivery path (once hosted, a server sees visits unless offline support is added), clipboard prompt, share sheet, keyboard overlap, font scaling. Option C ("money brakes" checklist) stays blocked on verified facts.
