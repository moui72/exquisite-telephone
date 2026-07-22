<!--
SYNC IMPACT REPORT
==================
Version change: 1.1.0 → 1.1.1
Modified sections: Project Scope & Intent — clarification (PATCH, no
principle added or redefined): maintainer/dev tooling that runs in Claude
Code (the ArDD skills, audit-help-text, and the curation ingestion skill)
is not part of the app runtime, so app-scope constraints — small private
party game, no premature scaling — bound the shipped server/client, not
maintainer tools. Prompted by the curation-data-aggregation-pipe plan,
which adds an LLM-backed ingestion skill as maintainer tooling.

Prior: Version change: 1.0.1 → 1.1.0
Modified sections: Quality Standards — removed two standards found
non-load-bearing on /ardd-refine --review: "Performance Budgets" (never
satisfied across 5+ features shipped since it was written; a prior plan
explicitly declined to fix it, carried as standing drift in
DEFECTS.md — decorative, not enforced) and "No Vendored Dependency With
a Nested .git" (the project has zero vendored dependencies anywhere in
the repo; the standard has never been invoked against a real decision).
Removing a governance requirement is at least MINOR-worthy even though
no principle was redefined.

Prior: Version change: 1.0.0 → 1.0.1
Modified sections: Project Scope & Intent (resolved the public
matchmaking/leaderboards open question as an explicit v1 scope
exclusion, not a design gap)
-->

---
name: constitution
status: stable
last_updated: 2026-07-22
workflow_mode: solo
next_step_prompt: auto
delegation: eager
merge_policy: auto
---

# Exquisite Telephone Constitution

## Project Scope & Intent

Exquisite Telephone is a browser-based multiplayer party game combining
Telestrations and skribbl.io: players alternate writing a phrase and
drawing it, each "book" passes around the circle of players, and at the
end everyone can see how a phrase drifted through the chain of
translation. Sessions are small private groups joining via a room code —
no accounts, no persistent identity beyond a session. Public lobbies and
matchmaking are a possible future direction but are explicitly out of
scope for v1 — no design work should assume or block on them arriving.

"The app" means the shipped server and client. **Maintainer/dev tooling
that runs in Claude Code — the ArDD skills, `audit-help-text`, and the
curation ingestion skill ([[infrastructure]] Curation Store) — is not app
runtime**: it ships no dependency into the server, touches no game state,
and is not bound by app-scope constraints. So an LLM-backed maintainer
tool is in scope even though the app itself runs no LLM.

## Core Principles

### I. Keep It Simple / No Premature Scaling

Optimize for a fun small-group game working well on a single server
instance, not for handling thousands of concurrent rooms on day one.
Complexity must be justified — default to the simplest solution that
satisfies the requirement, and introduce an abstraction only once genuine
duplication makes it unambiguous. Do not design for hypothetical future
scale (e.g. horizontal scaling, sharded room state) before it's needed.

### II. Mobile-Friendly Drawing

Drawing/touch input must work well on phones and tablets, not just
desktop with a mouse. This is a hard requirement, not a nice-to-have,
since players will frequently join from a phone.

### III. Test-First Development

Every code change is preceded by a test that exercises the behavior being
added or changed, written and confirmed to fail before any implementation
code is written. A task without a test requirement is the exception (a
pure research/decision task, or a documentation-only change), not the
default.

### IV. No Dead Architecture

When an approach is replaced, the old approach is deleted in the same
change — not archived in place, not left "for reference" in a directory
that no longer reflects reality. Documentation describes only what is
actually true of the current codebase.

### V. Check Library Idioms Before Building Custom Mechanism

Before implementing a custom mechanism to solve a problem in a concern
already owned by a depended-on library (e.g. reconnection, room
management via Socket.IO), check whether that library already has a
built-in, idiomatic way to solve it. Reaching for a hand-built solution
without checking first is surfaced as a question before being built, not
discovered as duplicated work later.

### VI. Single Source of State

Application state lives in one reactive store per runtime — a Svelte
store on the client, an authoritative in-memory room/game store on the
server. Shared mutable objects threaded by reference between modules, as
a substitute for the store, are not permitted; modules that need to see
the same state read from and write through the store.

### VII. Named Types Over Inline Duplication

A type used in more than one place (e.g. `Room`, `Player`, `Book`,
`Entry`) is a named, exported TypeScript type with a single source of
truth — not independently retyped at each usage site, even when the
inline shapes happen to match today.

### VIII. Dispatch Surfaces Decomposed by Concern

The Socket.IO event handler routes to named handler functions, one per
event type, each independently readable without scrolling through
unrelated cases. Duplicated logic across cases is extracted, not
copy-pasted.

### IX. Observability

Non-trivial server operations (room creation, player join/leave/reconnect,
turn advance, game completion) emit structured, machine-readable log
events, including outcome (success/failure) and identifiers sufficient to
reproduce an error without a debugger attached.

### X. Bootstrap/Entry Files Wire Dependencies Only

The server entry point is limited to reading config, constructing
dependencies, and starting the app. Game logic, socket transport glue,
and session-store persistence each live in their own module with a single
responsibility, imported by the entry point — never defined inline in it.

## Quality Standards

- Mobile-friendly touch cleanup: touch/pointer handlers registered for
  drawing are documented at the point of definition and cleaned up across
  Svelte's component lifecycle hooks — not left as a bare comment warning
  a future reader not to break them.
- Baseline Accessibility: UI is reasonably usable without a mouse or
  perfect vision — logical tab order, readable contrast, labeled form
  controls. Full WCAG 2.1 AA compliance is not required; this project is
  scoped to this baseline only.
- Manifest/Script Hygiene: `package.json`'s declared name, dependencies,
  and scripts match the actual package and files on disk. A stale script
  entry or unused dependency is treated as a bug, not background noise.

### Pre-commit Enforcement

A pre-commit hook runs lint, type-check, and the test suite, in that
order, before a commit is accepted. Bypassing the hook is prohibited
except in a documented emergency, and any bypass is followed immediately
by a commit that re-establishes the passing state.

### CI Enforcement

The same lint, type-check, and test suite required by the pre-commit hook
also run in CI on every push and pull request, and a failing run blocks
merge. CI is the actual gate of record; the pre-commit hook is a local
convenience that catches the same issues earlier and does not substitute
for it, since a hook can be skipped, uninstalled, or never configured on
a given clone.

## Development Workflow

1. Features are backlogged, planned into phased tasks, then implemented
   sequentially per the ARDD workflow (`.project/WORKFLOW.md`).
2. Solo workflow mode: work rides local worktree branches and merges to
   `main` locally; no PR review is required.
3. Any artifact documenting a known production shortcut or gap (a
   deliberate simplification, an unintentional gap awaiting future work,
   etc.) does so under a `## Production Annotations` heading — not inline
   prose elsewhere in the artifact — so `/ardd-plan`'s Production
   Annotation Summary step and `/ardd-audit` can rely on a single,
   consistent place to find them.

## Governance

This constitution supersedes all other practices documented in the
repository. Amendments require:

1. A written rationale explaining why the current principle is
   insufficient.
2. An updated Sync Impact Report (prepended as an HTML comment).
3. Version increment per semantic versioning: MAJOR for principle removal
   or redefinition; MINOR for new principle or material expansion; PATCH
   for clarifications or wording fixes.
4. `last_updated` date updated in frontmatter.

**Version**: 1.1.1 | **Ratified**: 2026-07-13 | **Last Amended**: 2026-07-22
