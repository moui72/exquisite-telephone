---
status: approved
branch: curation-store-hardening
created: 2026-07-20
features: []
surfaced-defects: []
---

# Plan — Append-only curation store, bounded inputs, deploy-channel parity

## Goal

Replace the Curation Store's mutated single JSON file with append-only,
server-named per-event files, bound entry content at the submission
boundary so untrusted input cannot grow the durable store without limit,
and correct the artifact and staging config so the two-app deployment
topology is described truthfully and beta stops discarding its curation
data.

## Scope

**In scope**

- F002 — append-only event files: one file per rating event, written
  once, never mutated. Aggregation deferred to read time.
- F002 — server-generated filenames (timestamp + random), never derived
  from player-influenced text.
- F001 — a maximum length on `Entry.content` at the submission boundary.
- F001 — a bound on curation event accumulation.
- Artifact revisions to `infrastructure.md` and `datamodel.md` recording
  both reversals.
- F001 — rewrite [[infrastructure]]'s Deployment section to describe the
  real two-app, two-channel topology instead of "a single Fly.io app
  ... one Dockerfile, one `fly.toml`", which is false and is the root
  cause of repeated dual-channel amnesia.
- F002 — bring `fly.staging.toml` to parity with `fly.toml` so beta
  stops silently discarding every rating it collects.
- Deleting the code the new shape makes dead: the debounce timer,
  `flush()`, the temp+fsync+rename write path, and the entire
  `gracefulShutdown` module (Principle IV — the old approach is deleted
  in the same change, not left in place).

**Out of scope**

- Any prompt-injection or sanitization defense for downstream *readers*
  of these files. Deliberate: player-written text will eventually reach
  an agent context during curation, but that defense belongs in the
  deterministic aggregation step, which is backlogged as
  `curation-data-aggregation-pipe` and not designed yet. Do not build
  speculative defenses into the write path.
- Building the aggregation script itself.
- The two capabilities backlogged alongside this feedback —
  `release-promotion-workflow` (a `workflow_dispatch` that
  fast-forwards `release` from `main`) and `fly-config-lockstep` (lint
  or generate the two Fly configs). Both are worth doing; neither is
  required to stop beta losing data today, and bundling them would
  delay a fix that is currently a two-line config change.
- Creating the Fly volumes. Already done, both verified in `iad`
  matching their machines' region: `vol_r681m3no1nq5ex14` (prod),
  `vol_vp2l1gyjj3lw9me4` (beta).
- Re-auditing what the feedback already confirmed safe: `JSON.stringify`
  serialization (no JSON injection), absence of `{@html}` in the client
  (Svelte auto-escapes, no XSS), and whole-event `JSON.stringify` in the
  logger (no newline log-forging). No work needed on any of these.
- Migrating any existing curation file. The store has never run in
  production — there is no data to migrate, and writing a migration for
  a file that does not exist is dead code on arrival.

## Technical Approach

**Why append-only is simpler, not just different.** A record written
exactly once and never mutated has no read-modify-write cycle, so the
debounce that batched mutations, the `flush()` that drained it, the
shutdown hook that called `flush()`, and the temp+fsync+rename dance
that made a whole-file rewrite survivable all become unnecessary
simultaneously. Crash safety degrades from "up to 2s of lost increments"
to "at worst one partial trailing file", and concurrent writers stop
being a correctness question — which retires the single-writer
production annotation and answers the "revisit if the app ever runs more
than one process" caveat currently in [[infrastructure]] rather than
deferring it.

**Filename hygiene is the new attack surface.** Path traversal is not
currently possible because the store path is a fixed config value. The
moment filenames exist, that changes. Names must be composed entirely of
server-controlled values — a timestamp and random suffix — with no
player-influenced component, not even a sanitized slug of the phrase. A
sanitized slug is the tempting shape and the wrong one: it puts
attacker-influenced bytes in a path for no benefit the timestamp does
not already provide. The write path should also refuse to write outside
its configured directory, so a future change to the naming scheme cannot
silently reintroduce traversal.

**Bounding is a submission-boundary concern, not a store concern.**
`Entry.content` is unbounded everywhere today — the only check is a
non-empty test — so the fix belongs where entries are accepted, ahead of
both the room store and the curation store. Bounding it at the boundary
means the cap protects in-memory game state too, not only the durable
file. The cap on event accumulation is a second, independent guard: a
bounded phrase submitted many times is still unbounded disk.

**The aggregate view stays in the type system.** `PromptRating` and
`CandidatePhrase` remain the shapes a curator reads; they simply stop
being the on-disk shape and become the derived result of folding the
event log. This keeps [[datamodel]]'s Persisted Entities meaningful
while the persisted *record* becomes an event.

**Why the deploy-parity items ride this plan rather than their own.**
F001 rewrites [[infrastructure]]'s Deployment section; Phase 1 already
rewrites that same file's Curation Store section and its Production
Annotations. Splitting them across two plans would mean two agents
editing one artifact with no ordering guarantee. F002 is a two-line
config change gated on the same understanding. The fix for F001 is
informational, not mechanical: agents are told to read artifacts before
acting, so an artifact that says "one app" is why the second channel
keeps being forgotten. The remedy is to correct the information source
— not to add a warning comment to a TOML that agents have no reason to
open.

Test-first throughout (Principle III). The traversal refusal and the
length cap are the cases most worth failing first — both are security
properties, and a security property with no failing test is a claim
rather than a guarantee.

## Phase Breakdown

### Phase 1 — Artifact revisions
_Depends on: nothing_

Records every reversal and correction before code changes, so
implementation has a current spec to work against. All four items edit
`.project/artifacts/`, and two edit the same file — keep them in one
phase so no later phase races them.

- Rewrite [[infrastructure]]'s Curation Store **Shape** and
  **Durability** sections for append-only per-event files; remove the
  debounce and atomic-rename prose; resolve the "revisit if more than
  one process" caveat rather than leaving it pending. Add the
  server-generated-filename constraint. Remove the single-writer
  production annotation and the up-to-2s-loss annotation, both of which
  the new shape retires. (F002) [artifacts: infrastructure]
- Re-frame [[datamodel]]'s Persisted Entities: the persisted record
  becomes a rating **event**; `PromptRating` and `CandidatePhrase`
  become the derived aggregate view. Add the `Entry.content` maximum
  length as a normalization rule. [artifacts: datamodel]
- Rewrite [[infrastructure]]'s **Deployment** section for the real
  topology: two Fly apps (`exquisite-telephone`,
  `exquisite-telephone-beta`), two configs, two API tokens, two CI
  deploy jobs. Record the channel semantics — `main` deploys beta;
  prod deploys only from `release`, which only ever receives a
  fast-forward of `main` (which is why CI skips `checks` there). Each
  channel has its own app, config, token, and volume. Explicitly label
  the remaining one-time manual CLI steps as such (`fly volumes
  create`, `fly scale count 1`, per app) — those are exactly what gets
  forgotten. (F001) [artifacts: infrastructure]

### Phase 2 — Beta/prod config parity
_Depends on: Phase 1_

Urgent and independent of the storage rework: beta discards every
rating it collects on each auto-deploy from `main`, and fails
invisibly while doing so. Landing this early stops live data loss
without waiting on Phases 3–5.

- Add the `[mounts]` block and `CURATION_DATA_PATH` to
  `fly.staging.toml`, matching `fly.toml`. The beta volume already
  exists, so there is no window where a declared mount has no volume
  behind it. (F002) [artifacts: infrastructure]
- Correct or remove that file's "Mirrors fly.toml; only `app` differs"
  header comment, which is currently false and was not enforcement in
  the first place.

### Phase 3 — Bound entry content at the submission boundary
_Depends on: Phase 2_

Independently valuable and independently testable — this phase fixes a
live gap in shipped behavior regardless of the storage rework.

- A maximum length constant and its enforcement in the submit path,
  rejecting oversize content with a clear failure rather than
  truncating silently. (F001) [artifacts: datamodel]
- Covers text entries and the serialized drawing payload, which is the
  larger of the two and equally unbounded today.

### Phase 4 — Append-only event store
_Depends on: Phase 3_

- Replace the store's write path with one file per event, named from
  server-controlled values only, plus a guard refusing any resolved path
  outside the configured directory. (F002) [artifacts: infrastructure]
- A read path that folds the event files into the aggregate view.
- A bound on event accumulation. (F001)

### Phase 5 — Delete what the new shape made dead
_Depends on: Phase 4_

Principle IV — the replaced approach is deleted in the same change, not
archived in place.

- Remove the debounce timer, `flush()`, and the temp+fsync+rename write
  path.
- Remove the `gracefulShutdown` module and its wiring, which existed
  solely to drain the debounce.
- Confirm no test still asserts the deleted behavior, and that the suite
  is green with the code gone rather than merely unreferenced.

## Complexity Tracking

| Deviation | Justification |
|---|---|
| Rewriting a storage layer merged the same day | The replacement is strictly simpler — it deletes a module and two production annotations rather than adding anything. Doing it now, before any real data exists, avoids both a migration and the risk of the more complex design becoming load-bearing. |
| A path-containment guard on top of server-generated filenames | Belt and braces on a security property, which Principle I's simplicity preference does not outrank. The generated names are safe today; the guard is what keeps a *future* naming change from silently reintroducing traversal. |

## Open Questions

1. **What is the maximum entry content length?** Text phrases and
   serialized drawing payloads differ by orders of magnitude, so this is
   likely two limits rather than one. Resolve in Phase 3 by measuring a
   realistic drawing's serialized size and setting the cap above it with
   margin, rather than picking a round number.
2. **What bounds event accumulation — count, total bytes, or age?**
   Count is simplest; bytes bound the actual risk; age matches how a
   curator works. Resolve in Phase 4. Whatever is chosen must fail
   safely: a full store must never block a game turn.
3. **Should aggregation happen at server boot or only on demand?**
   Nothing in the running game reads the aggregate, so boot-time folding
   may be pure startup cost for no benefit. Leaning on-demand, which
   also keeps the door open for the backlogged aggregation script to be
   the only reader. Resolve in Phase 4.

## Production Annotation Summary

- **Removed by this plan**: the single-writer/volume-bound annotation
  (append-only files have no concurrent-writer correctness problem —
  though the Fly volume still pins the app to one machine, which the
  Deployment section already states independently) and the
  up-to-2s-lost-on-unclean-crash annotation (no debounce, nothing
  buffered to lose).
- **Retained**: player-written content retained past the session
  ([[datamodel]]) — unchanged by this plan; the text is still stored, in
  a different file layout.
- **Possibly added in Phase 4**: whatever the accumulation bound
  discards or refuses at the limit is a deliberate shortcut and should
  be annotated where it is enforced.
