---
status: planned
created: 2026-07-20
plan: plan-curation-store-hardening-2026-07-20-d61f.md
---

# Feedback

## Bugs

- [x] F001 No maximum length validation on entry content anywhere in the
  codebase — the only check is `input.content.trim().length > 0`
  (`server/src/socket/handlers.ts`). A player can submit an arbitrarily
  large phrase. Pre-existing, but materially worse now that curation data
  persists: an oversized or high-volume submission becomes permanent disk
  growth, re-read at every boot, rather than dying with the room. Needs a
  max length on entry content at the submission boundary and a cap on
  candidate accumulation. [artifacts: datamodel, infrastructure]

  Already safe, confirmed by inspection — do NOT spend work here:
  serialization uses `JSON.stringify` throughout (no JSON injection);
  there is no `{@html}` anywhere in the client, so Svelte auto-escapes
  (no XSS); the logger `JSON.stringify`s whole events (no newline
  log-forging).

## Reconsidered

- [x] F002 The Curation Store should be **append-only** — one file per
  rating event, server-named, aggregated downstream at curation time —
  rather than a single JSON file read at boot, mutated in memory, and
  rewritten under a debounce. Each event is then written exactly once and
  never mutated, which removes the debounce timer, the temp+fsync+rename
  atomic-write dance, `flush()`, the whole `gracefulShutdown` module, and
  two production annotations (the single-writer assumption and the
  up-to-2s-lost-on-unclean-crash window). Crash safety becomes "worst
  case one partial file" instead of "lost increments"; concurrent writers
  stop being a concern. Aggregation moves to read time, where a human or
  a deterministic script is already involved.
  [artifacts: infrastructure, datamodel]

  **New constraint this introduces:** filenames MUST be server-generated
  (timestamp + random) and never derived from any player-influenced text,
  including a sanitized slug of the phrase. Path traversal is not a risk
  today only because the store path is a fixed config value — per-file
  storage is precisely what makes it live.

## Out of scope (recorded, not actionable here)

Player-written phrases are untrusted text that will eventually flow into
an agent context during curation. That defense belongs in the
deterministic aggregation step between the files and any agent — logged
as `curation-data-aggregation-pipe` in the feature register — and that
pipeline is not designed yet. **Do not build speculative
prompt-injection defenses into the write path.**
