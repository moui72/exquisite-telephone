---
plan: plan-reusable-confirmation-modal-co-2026-07-23-029e.md
generated: 2026-07-23
status: in-progress
---

# Tasks

## Phase 1: Reusable ConfirmDialog component

- [ ] T001 [artifacts: ui] Write a failing component test for a new
  `client/src/lib/components/ConfirmDialog.svelte`: it renders a
  caller-supplied heading, body, confirm-label, and cancel-label; clicking
  confirm emits a `confirm` event and clicking cancel emits `cancel`;
  Escape emits `cancel`; on mount focus lands on the cancel control; a
  `destructive` prop applies the destructive styling class to the confirm
  action. Confirm the test fails first (component does not exist yet); under
  the full-suite pre-commit hook, mark the spec `test.fails`/skip on this red
  commit and remove that marker in T002.

- [ ] T002 [artifacts: ui] Implement `ConfirmDialog.svelte` to pass T001:
  props `heading`, `body`, `confirmLabel`, `cancelLabel`, `destructive`
  (default false); `confirm` / `cancel` events; `role="alertdialog"` with
  `aria-modal="true"`, a dependency-free focus trap while open, initial focus
  on the cancel control, and Escape mapped to cancel (Baseline Accessibility,
  constitution). Style it in the salon visual language (gilt-frame/plaque,
  per ui.md Visual Identity), reusing `GiltFrame` where it fits. Remove the
  T001 red-marker so the test runs and passes.

## Phase 2: Migrate the Reveal warning

- [ ] T003 [artifacts: ui] Replace the Reveal unread-books warning's bespoke
  inline modal markup in `client/src/lib/views/Reveal.svelte` (currently the
  `role="alertdialog"` block) with the shared `ConfirmDialog`, keeping the
  existing `requestHostAction` / `forceHostAction` / `cancelHostAction` logic
  and the `bookReads` / `currentlyReading`-derived message variants exactly
  as they are — a behavior-preserving refactor. Wire the dialog's `confirm`
  to the force-through path and `cancel` to cancel. Update `Reveal.test.ts`
  so the existing assertions (warning shows when a book is unread/open;
  force-through emits the action; cancel does not) pass against the shared
  component. Confirm no behavior change: the same conditions trigger the same
  outcomes.

## Phase 3: Guard the moderation panel

- [ ] T004 [artifacts: ui] Write failing tests in `ModerationPanel`'s test
  file: clicking **End game** shows a `ConfirmDialog` ("End the game for
  everyone?") and only calls `session.endGame()` on confirm (not on cancel);
  clicking **Restart** shows a `ConfirmDialog` ("Restart from turn 0? All
  current progress is lost.") and only calls `session.restartGame()` on
  confirm; and clicking **Kick** shows a `ConfirmDialog` ("Kick <player>?")
  and only calls `session.kickPlayer(...)` on confirm (not on cancel).
  Confirm these fail first against the current fire-immediately behavior
  (mark red appropriately for the pre-commit hook).

- [ ] T005 [artifacts: ui] Implement the guards in
  `client/src/lib/components/ModerationPanel.svelte` to pass T004: route
  **End game**, **Restart**, and **Kick** through the shared `ConfirmDialog`
  (destructive variant, no read-state — a plain are-you-sure) before calling
  their session methods; the Kick dialog names the target player. This closes
  feedback F001. Remove the T004 red-markers so the tests run and pass.
