---
status: planned
created: 2026-07-14
plan: plan-turn-room-engine-2026-07-14-9249.md
---

# Feedback

## Reconsidered
- [x] F001 Turn progression should be strictly synchronous/round-gated: a player shouldn't be assigned their next book until every player has completed their current turn (entry) across all books — reversing the currently-documented asynchronous design where each book's round-robin advances independently and players may be working on different books/rounds at the same time. [artifacts: datamodel, ui]
