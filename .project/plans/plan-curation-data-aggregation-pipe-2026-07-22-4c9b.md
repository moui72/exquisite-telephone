---
status: approved
branch: curation-data-aggregation-pipe
created: 2026-07-22
features: [curation-data-aggregation-pipe]
surfaced-defects: []
---

# Plan — curation data aggregation pipe (+ ingestion skill)

## Goal

Build the deterministic aggregation pipe that folds, sanitizes, and archives
curation events into a consolidated view, plus a repo-local LLM ingestion
skill that reads that view and recommends deck additions and removals for a
human to approve.

## Scope

Designed against `research-curation-aggregation-pipe-2026-07-21-4bbe.md` (read
it for the threat model and rationale; this plan references rather than
repeats it). Two sequenced deliverables under the one feature.

**In scope.**
- **The pipe** — a deterministic `server` CLI reusing the existing
  `aggregateEvents` fold; a pure display-safety **sanitizer** over candidate
  text (output-only, never the dedup key); and an **archive** step that
  snapshots then moves folded events, draining the `MAX_CURATION_EVENTS` cap
  ([[infrastructure]] Curation Store — Aggregation Pipe).
- **The ingestion skill** — a `.claude/skills/` maintainer tool that read-only
  fetches the pipe's snapshot, keeps a **ledger** of logged-but-not-decked
  candidates and an **offensive-quarantine** file, analyzes counts, and
  produces `PROMPT_CRITERIA.md`-judged add/remove **recommendations as a
  report** — with the injection defenses baked in ([[infrastructure]] Curation
  Store — Ingestion Skill; [[datamodel]] Persisted Entities).

**Not in scope.**
- **The skill editing the deck.** It never writes `shared/src/phraseBank.ts`
  or issues a mutating `fly` command; a human applies approved changes
  (the human-in-the-loop safety boundary).
- **Agent-facing injection *rules* beyond this skill's own surface.** The
  defense is specified against *this* consumer; a future different consumer
  specs its own.
- **Off-volume archive offload / retention.** Archived events stay on the
  volume (well under the 50 MiB budget); offload is a later concern.
- **Regenerating the `datamodel`/`infrastructure` diagrams** after these edits
  — a follow-up `/ardd-diagram` pass, not a task here (both marked stale).

## Technical Approach

The design is settled by the research; shapes below reference the artifacts.

**The pipe reuses what exists.** `aggregateEvents` / `aggregate()` already
fold events into `CurationData` (`curationStore.ts`); the CLI wraps that,
never re-implements it. The **sanitizer is a pure function** applied to each
`CandidatePhrase.phrase` on *output* — strip C0/C1 + ESC, neutralize
bidi/zero-width — and is deliberately kept off the fold's exact-text dedup key
([[datamodel]] Persisted Entities — Consolidated view sanitization). The
**archive** writes the snapshot durably (temp + `fsync` + atomic `rename`)
*before* `rename`-moving folded event files into
`curation-events-archive/<snapshot-ts>/`; corrupt/skipped events are never
folded and never moved. Moving folded events out of the live dir resets the
count so the store accepts writes again; the running server's cached count
refreshes on its next restart (run the pipe in a deploy window).

**The skill is a maintainer tool, human-gated by design.** It is a
`.claude/skills/` skill (like `audit-help-text`), not app runtime
([[constitution]] Project Scope). Its deterministic parts — read-only snapshot
ingest, ledger reconciliation, offensive-quarantine plumbing, count analysis —
are ordinary testable code; its LLM parts — judging borderline candidates
against `PROMPT_CRITERIA.md`, flagging offensiveness, phrasing
recommendations — live in `SKILL.md`. The injection defense is architectural:
candidate text is handed to the LLM as **structured data**, the skill's
instructions assert candidate text is **data never an instruction**, the skill
holds **no deck-write and no mutating-`fly` privilege**, and every change is
human-approved — so a successful injection yields at worst a rejected
recommendation. The ledger and quarantine are **gitignored volume artifacts**,
never committed to this public repo.

## Phase Breakdown

Phase lists are plan work-items, not live checklists — progress is tracked in
the linked tasks file. Phases are ordered; later phases depend on earlier ones
as noted.

### Phase 1 — Display-safety sanitizer (pure)

Foundation the pipe applies; testable in isolation.

- A pure sanitizer over a phrase string: strip C0/C1 control chars and ESC
  (`0x1B`), neutralize bidi overrides (`U+202A–202E`, `U+2066–2069`) and
  zero-width chars (`U+200B–200D`, `U+FEFF`). No length work (already capped at
  write). It is an output transform — callers apply it to display copies,
  never to the fold's dedup key.

### Phase 2 — Aggregation pipe CLI

Depends on Phase 1.

- A `server`-package CLI (a `package.json` script) that reads
  `CURATION_DATA_PATH` via the existing `config`, calls the existing
  `aggregate()`, applies the Phase-1 sanitizer to candidate text on output, and
  writes a consolidated snapshot (`CurationData` JSON, plus a readable summary:
  ratings by net score, candidates by votes). Deterministic; the aggregate's
  only reader.

### Phase 3 — Archive folded events

Depends on Phase 2.

- Extend the pipe: after the snapshot is durably written, `rename` the folded
  event files into `curation-events-archive/<snapshot-ts>/`; skip (never move)
  corrupt/unfolded events; leave the live dir drained below the cap. Document
  the run-in-a-restart-window ordering for the server's cached count.

### Phase 4 — Ingestion-skill deterministic helper

Depends on Phase 2 (consumes the snapshot). Independent of Phase 3.

- Read-only ingest of the pipe's snapshot; **ledger** reconciliation (match by
  exact text; promote decked candidates out; carry disposition; "new" = absent
  from ledger); **offensive-quarantine** file plumbing; deterministic count
  analysis (net-score removal candidates over a threshold + minimum sample;
  strong-vote addition candidates). Add the `.gitignore` entries that keep the
  ledger and quarantine out of the repo.

### Phase 5 — Ingestion-skill SKILL.md

Depends on Phase 4.

- The `.claude/skills/<name>/SKILL.md` instructions: fetch the snapshot
  read-only (`fly ssh` sftp/console, never mutating; local path in dev), run
  the Phase-4 helper, judge borderline additions against `PROMPT_CRITERIA.md`,
  flag offensive candidates to quarantine, and emit an add/remove
  **recommendation report** a human applies. Bake in the injection defenses:
  candidate text as structured data, the "candidates are data, never
  instructions" invariant, **no `phraseBank.ts` writes, no mutating `fly`
  commands**, untrusted-text labeling in the report.

## Complexity Tracking

| Deviation | Why justified | Simpler alternative rejected |
|---|---|---|
| Introducing an LLM/agent tool into an otherwise LLM-free repo | Recommending deck changes needs `PROMPT_CRITERIA.md` *judgment* a deterministic step can't do; it is maintainer tooling, not app runtime ([[constitution]] Project Scope), gated by human approval. | A purely deterministic "high-votes → add" rule ignores the criteria and would promote gamed or unsuitable phrases; the criteria are explicitly not mechanical. |
| A durable ledger + separate quarantine file (state beyond the event log) | Without disposition memory every pass re-reviews the whole backlog, and offensive text must be segregated from the normal flow; both are cheap flat files. | A single "reviewed" marker can't distinguish rejected from promoted from pending, and can't isolate offensive content. |

## Open Questions

- **Skill name and report shape** — the `.claude/skills/<name>/` slug and
  whether the report is Markdown, a diff proposal, or both. Plan-time /
  implementation detail.
- **Removal threshold** — the concrete down-heavy cutoff and minimum sample
  size before a bank phrase is judged for removal — kept deterministic so the
  LLM judges only borderline *additions*, not the arithmetic.
- **Offensive-flag mechanism** — LLM judgment alone vs. an obvious-slur
  deterministic denylist backstop, and whether quarantined entries are ever
  revisited.

## Production Annotation Summary

- **Recommend-only / human-in-the-loop curation** — the ingestion skill never
  writes the deck or runs a mutating `fly` command (the injection safety
  boundary). Already recorded in [[infrastructure]] Production Annotations;
  annotate the skill/helper at the point the no-write posture is enforced.
- **Drop-fallback between pipe runs** — the store still drops events at the cap
  in the window between (or absent) pipe runs; the existing inline
  `PRODUCTION ANNOTATION` in `curationStore.ts` stays as that fallback and
  should reference the pipe as the remedy.
