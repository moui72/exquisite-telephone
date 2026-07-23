---
status: approved
branch: reusable-confirmation-modal-co
created: 2026-07-23
features: [reusable-confirmation-modal-co, host-control-confirmation-guar]
surfaced-defects: []
---

# Plan: Reusable Confirmation Dialog + Host-Control Guards

## Goal

Build one reusable, accessible confirmation-dialog component in the salon
visual language, migrate the Reveal unread-books warning onto it, and use it
to guard all three destructive Moderation Panel controls — End game, Restart,
and Kick.

## Scope

**In scope**
- A single `ConfirmDialog` component with caller-supplied heading, body,
  confirm-label, and cancel-label, plus a destructive variant.
- Accessibility: `role="alertdialog"`, `aria-modal`, focus trap, initial
  focus on cancel, Escape = cancel.
- Salon styling consistent with Visual Identity (gilt-frame/plaque).
- Migrating the Reveal unread-books warning (`Reveal.svelte`) onto the
  component with **no behavior change** (same read-state message, same
  force-through).
- Guarding all three destructive Moderation Panel controls — **End game**,
  **Restart**, and **Kick** — with the component (a plain are-you-sure, no
  read-state) — closes feedback F001.

**Out of scope**
- The Lobby small-game force-anyway **checkbox** acknowledgement — a
  different interaction pattern (an inline gate, not a modal); not migrated.
- The Rules Overview panel and the Reveal per-book reader modal — not
  confirmations, keep their own markup ([[ui]] Confirmation Dialog).

## Technical Approach

Grounded in [[ui]] Confirmation Dialog (shared component), Moderation Panel,
and Reveal View.

- **One component, text via props.** The confirm/cancel decision is the only
  behavior; everything visible is a prop, so the same component serves the
  Reveal warning and the host-control guards without special-casing. The
  destructive variant styles the confirm/force-through action distinctly.
- **Behavior-preserving migration.** The Reveal warning already routes host
  actions through a request/confirm/force path (`requestHostAction` /
  `forceHostAction` / `cancelHostAction`); this plan swaps its bespoke inline
  markup for the shared component while keeping that logic and the
  `bookReads` / `currentlyReading`-derived messaging intact — a refactor, not
  a behavior change.
- **Additive guards on the moderation panel.** End game, Restart, and Kick
  move from firing directly to opening the shared dialog first. Read-state
  stays a Reveal-only concern.
- **No server change.** Confirmations are entirely client-side; `onEndGame` /
  `onPlayAgain` / `onRestartGame` remain force-through server-side ([[ui]],
  [[datamodel]]).

## Phase Breakdown

Phase lists are plan work-items, not live checklists — progress is tracked
in the linked tasks file.

**Phase 1 — The reusable ConfirmDialog component** (no dependencies) —
`reusable-confirmation-modal-co`
- Build the `ConfirmDialog` component: props (heading, body, confirmLabel,
  cancelLabel, destructive), confirm/cancel events, and the accessibility
  contract (`role="alertdialog"`, `aria-modal`, focus trap, initial focus on
  cancel, Escape = cancel), styled in the salon visual language.
- Component test covering: renders supplied text, confirm/cancel fire the
  right events, Escape cancels, focus lands on cancel, destructive variant
  applies.

**Phase 2 — Migrate the Reveal warning** (depends on: Phase 1) —
`reusable-confirmation-modal-co`
- Replace the Reveal unread-books warning's inline markup with the shared
  component, preserving the read-state message variants and the
  force-through path unchanged. Update `Reveal.test.ts` to assert the same
  behavior now renders through the component.

**Phase 3 — Guard the moderation panel** (depends on: Phase 1; parallel to
Phase 2) — `host-control-confirmation-guar`, feedback F001
- Gate **End game**, **Restart**, and **Kick** in `ModerationPanel.svelte`
  behind the shared dialog (plain are-you-sure, destructive variant, no
  read-state). Test that each control shows the dialog and only fires its
  session call on confirm (not on cancel). [artifacts: ui]

## Complexity Tracking

Principle I asks that an abstraction be introduced "only once genuine
duplication makes it unambiguous."

| Item | Justification |
|---|---|
| A new shared `ConfirmDialog` component | Not new complexity but a **net de-duplication**: three bespoke inline confirm overlays already exist; extracting one component removes duplication and is exactly the "introduce an abstraction once duplication is unambiguous" case Principle I describes. |

## Open Questions

- **Focus-trap implementation** — there is no existing focus-trap utility in
  the client; decide whether to hand-roll a minimal trap in the component or
  add a tiny helper. Keep it dependency-free (Principle I).
- **Kick confirmation cadence** — Kick is per-player and may be used a few
  times in a row; confirm the per-kick dialog reads acceptably (naming the
  player) rather than feeling like a wall of modals, and consider whether the
  dialog should not re-prompt within a rapid sequence. Resolve during Phase 3.

## Production Annotation Summary

No production annotations are owed — this is a client-side UI refactor plus
two additive confirmations, introducing no production shortcut.
