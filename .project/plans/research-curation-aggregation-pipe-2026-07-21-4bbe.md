---
topic: curation-data-aggregation-pipe — shape (CLI, sanitization/threat model, archive)
date: 2026-07-21
status: complete
---

# Research: curation-data-aggregation-pipe

## Question

Settle the shape of the deterministic, agent-free curation aggregation pipe
across three axes: (1) the consumption surface, (2) the sanitization spec and
the threat model it defends, and (3) the archive/drain policy for the
`MAX_CURATION_EVENTS` cap — so a later `/ardd-plan
curation-data-aggregation-pipe` has a settled design to task against. The
feature's `Why:` frames the pipe as the prompt-injection defense layer for
untrusted player-written text; the crux is whether that framing describes a
threat that exists today.

## Findings

### The current threat model: a human curator, no agent

Verified against the codebase:

- **No LLM/agent anywhere in the app.** No `anthropic`/`openai`/LLM SDK in
  any `package.json`; no prompt-construction code.
- **Nothing consumes the aggregate.** `aggregate()` / `CurationData` /
  `aggregateEvents` have **no caller outside `curationStore.ts` and its
  tests** — the fold is written but unwired (deliberately: the store's
  OPEN QUESTION 3 note reserves this pipe as "the aggregate's only
  reader").
- **`CURATED_PHRASE_BANK` never ingests candidate text automatically.** It
  is a static build-time constant (`shared/src/phraseBank.ts`), read only by
  `promptOrigin.ts` and `handlers.ts` to (a) classify an opening phrase's
  origin and (b) deal curated prompts. Player-written *candidates* reach the
  bank only when a **human curator reviews them and hand-edits the
  constant**.

So the **actual** consumer today is a human reading verbatim player text in a
terminal or file. There is **no prompt/agent to inject into** — the
"prompt-injection defense" `Why:` is *anticipatory*, describing a future in
which an agent ingests the bank/candidates.

### What "sanitization" means for each consumer

The honest conclusion — and it reframes "full injection-hardening now":

**Prompt-injection defense is structural and consumer-shaped, not a fixed
string filter.** You cannot reliably regex away injection; the real defense
is *isolation* — putting untrusted text in a clearly delimited,
non-instruction position, using the consumer's structured-input mechanism,
and never concatenating candidate text into an instruction. That defense
can only be specified against a **concrete consumer's ingestion shape**.
Writing a fixed "injection sanitizer" now, with no consumer, would be
security theater: a plausible filter that passes tests and defends nothing
real, baked into TDD as if it did.

What *is* concrete, deterministic, and testable today is **display-safety**
for the human curator:

- **Neutralize terminal-escape / control characters** — strip or escape C0/C1
  controls, especially ESC (`0x1B`), so a crafted phrase can't inject ANSI
  sequences into the curator's terminal.
- **Neutralize display-spoofing Unicode** — bidi overrides
  (`U+202A–202E`, `U+2066–2069`) and zero-width characters
  (`U+200B–200D`, `U+FEFF`), which can make a phrase render as something
  other than its bytes.
- **Length is already handled** — candidate text is byte-capped at the write
  boundary (`MAX_TEXT_ENTRY_BYTES = 610`, `shared/src/entryLimits.ts`), so
  the pipe needs no length work.

**Critical interaction — sanitize for display, never the dedup key.** The
fold dedups candidates by **exact text**, deliberately keeping near-miss
wordings separate (`aggregateEvents`, and datamodel.md CandidatePhrase). Any
normalization (NFC, case, whitespace) applied for display must **not** change
the folding/dedup key, or it silently merges phrases the design keeps
distinct. The sanitizer is an *output* transform over an already-folded
`CandidatePhrase.phrase`, not a change to the fold.

### The pipe as the chokepoint (honoring the `Why:` without over-building)

The right synthesis of the `Why:` and Principle I: **establish the boundary
now, defer the injection rules.** The pipe is the single place all
curator-facing candidate text flows through, so it is *the* chokepoint where
sanitization lives (not scattered into the write path — which is exactly what
the `Why:` argues, and why the write path stores raw bytes). Its **current
rules are display-safety**; the doc comment at that boundary names it as the
place injection-specific rules get added **when a concrete agent consumer is
designed**, specified against that consumer. This is not "display-safety
instead of the `Why:`" — it is the `Why:`'s boundary, with the only rules
that can be written honestly today.

### Consumption surface: a deterministic CLI (confirmed)

A `server`-package CLI is the simplest sufficient shape (Principle I; curation
is read by one human every few weeks):

- A script (e.g. `server` `package.json` `"curation:aggregate"`, a thin
  `bin`-style entry) that reads `CURATION_DATA_PATH` via the existing
  `config`, calls the existing `aggregate()`, runs the sanitizer over
  candidate text, and writes/prints a consolidated view (raw `CurationData`
  JSON plus, optionally, a human-readable summary — ratings by net score,
  candidates by votes).
- **Operational reality:** in production the data lives on the Fly volume,
  so the curator runs the CLI **inside the machine** (`fly ssh console`) or
  pulls the events down (`fly ssh sftp`). Dev uses the local gitignored
  `CURATION_DATA_PATH`. This is an ops note for the plan, not a design
  fork.

### Archive/drain policy (user chose ARCHIVE) — concrete spec

- **Order that is crash-safe:** write the consolidated **snapshot first**
  (durably: temp-file + `fsync` + atomic `rename`), *then* move the folded
  event files. Never delete/move an event that isn't already captured in a
  durable snapshot.
- **"Folded" = successfully read, parsed, and incorporated.** A corrupt or
  truncated event that the fold skipped (the append-only crash case) is **not
  folded** — leave it in place (or quarantine it), never archive/discard it,
  so a lost rating is visible rather than silently swept away.
- **Move, don't delete:** `rename` folded event files into an archive subdir
  (e.g. `curation-events-archive/<snapshot-ts>/`) on the same filesystem
  (atomic). Raw trail preserved; no data loss (the chosen policy).
- **This resets the COUNT cap, which is what matters.** `MAX_CURATION_EVENTS`
  bounds the *count of files in the live events dir*; moving folded events out
  drops that count, so the store accepts new ratings again. Disk is a separate
  axis — archived events still occupy the volume (50 MiB budget of 1 GB, far
  from pressure); eventual off-volume offload is a later concern, not this
  feature's.

### The stale-count interaction (must be in the plan)

The running server seeds its in-memory event `count` once (`readdir` on first
write after boot) and increments from there. The pipe runs as a **separate
process** and moves files out of the live dir — so after an archive run the
**server's cached `count` is stale (still high)** and it keeps rejecting
writes as "full" until the process restarts. Simplest resolution (Principle
I): **run the pipe in a restart/deploy window** — a deploy restarts the
process and re-seeds `count` from the now-smaller dir. Document this ordering
rather than adding server↔pipe signaling. (Because the cap is only reached
after 65,536 ratings — which the app has never approached — this is a
correctness note, not an urgent path.)

### Critical lenses (proposal-vetting)

- **Simplicity:** reuse `aggregateEvents`/`aggregate()` verbatim; a CLI + a
  pure sanitizer + an archive routine. No new deps, no service. ✅
- **Failure modes:** snapshot-before-move ordering; skip-not-archive corrupt
  events; fail-safe (curation is telemetry, never fatal). ✅
- **Standardness:** temp+fsync+rename is the standard durable-write idiom the
  store's own history already discusses. ✅
- **Semantics:** the exact-text dedup key must survive — sanitize output, not
  the key. Called out. ✅
- **Proportionality:** building a fixed injection sanitizer against no
  consumer is *disproportionate* and false-comforting; the display-safety +
  chokepoint scope is proportional to the real threat. ✅

## Recommendation

**Route: `/ardd-plan curation-data-aggregation-pipe`** — the shape is now
settled enough to design and task. Plan it as:

1. A deterministic **CLI** in `server` reusing `aggregate()`; output = raw
   `CurationData` JSON + a readable summary.
2. A pure, deterministic **display-safety sanitizer** over candidate text
   (strip C0/C1 + ESC; neutralize bidi/zero-width), applied to *output only*,
   never to the fold/dedup key — and documented as the chokepoint where
   agent-facing injection rules land **once a concrete consumer exists**.
3. An **archive** routine: durable snapshot → move folded events to an
   archive subdir; skip (never archive) corrupt events; plus a plan note that
   the server is restarted after an archive run so its cached count refreshes.

Artifacts to update at plan time: `infrastructure.md` Curation Store (the
pipe, the sanitization chokepoint, the archive mechanism, and rewriting the
`MAX_CURATION_EVENTS` production annotation now that its named remedy is being
built) and `datamodel.md` Persisted Entities (the consolidated view is
sanitized `CurationData`; the dedup-key invariant).

## Rejected Alternatives

- **Full prompt-injection sanitizer now** (the user's initial pick): rejected
  as security theater — injection defense is structural and consumer-shaped,
  and there is no consumer to specify it against; a fixed filter baked into
  TDD would defend nothing real while reading as if it did. The *boundary* is
  established now; the *rules* wait for a real consumer.
- **HTTP endpoint / dashboard for the aggregate:** rejected (Principle I) —
  one human every few weeks doesn't warrant a service; a CLI over the volume
  is sufficient.
- **Delete folded events** instead of archive: available and simpler, but the
  user chose archive (no data loss); recorded here as the cheaper-but-lossy
  alternative.
- **Age/byte-based accumulation bound:** already resolved to COUNT in
  `curationStore.ts` (OPEN QUESTION 2) with recorded rationale; not reopened.

## Open Questions

- **Human-readable summary format** — sort orders and fields for the curator
  digest (net-score for ratings, votes for candidates) — a small plan-time
  detail, not a blocker.
- **Archive retention / off-volume offload** — when (if ever) archived events
  leave the volume. Out of scope for this feature; revisit only under real
  disk pressure, which the 50 MiB budget makes remote.
- **The agent-consumer trigger** — the injection rule set is deferred to
  whenever a feature introduces an agent that ingests the bank/candidates;
  that feature, not this one, specs the rules against its own ingestion shape.
