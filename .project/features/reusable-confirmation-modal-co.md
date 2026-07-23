---
slug: reusable-confirmation-modal-co
status: tasked
logged: 2026-07-23
plan: plan-reusable-confirmation-modal-co-2026-07-23-029e.md
tasks: tasks-reusable-confirmation-modal-co-9935.md
---

A single reusable confirmation-dialog component with customizable text (heading, body/message, confirm-label, cancel-label, and an optional destructive/force variant), replacing the hand-rolled inline confirm markup currently duplicated across the client.
Why: today every confirm/warning modal is bespoke inline markup (Reveal's unread-books warning, ModerationPanel, RulesOverview each roll their own); there is no shared confirm component, so guarding a new control means copying a dialog. A reusable one is the vehicle for [[host-control-confirmation-guar]] and removes the duplication.
