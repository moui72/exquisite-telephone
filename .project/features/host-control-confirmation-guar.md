---
slug: host-control-confirmation-guar
status: implemented
logged: 2026-07-23
plan: plan-reusable-confirmation-modal-co-2026-07-23-029e.md
tasks: tasks-reusable-confirmation-modal-co-9935.md
---

Every destructive host control is protected by a confirmation before it fires — extending the guard the Reveal page already has to the ModerationPanel's End game, Restart, and Kick controls — while the read/not-read book-completion state is surfaced in the confirmation only in the currently-guarded reveal situation (where reading is the thing at risk).
Why: addresses feedback F001 (feedback-host-control-confirmations) — moderation-panel host controls currently fire immediately, risking accidental irreversible game loss. Builds on [[reusable-confirmation-modal-co]]. Read-state context stays scoped to reveal because pre-reveal there is nothing read to lose; elsewhere a plain are-you-sure suffices.
