/**
 * Maximum sizes for `Entry.content` (datamodel.md Normalization Rules —
 * `Entry.content` has a maximum length).
 *
 * TWO limits, not one: text phrases and serialized drawing payloads differ
 * by four orders of magnitude, so a single cap would either truncate real
 * drawings or fail to bound text meaningfully.
 *
 * Both numbers below are DERIVED FROM MEASUREMENT, not picked as round
 * numbers. The measurements are recorded at each constant so a later
 * reader can re-derive or challenge them rather than guessing at intent.
 *
 * Both are measured in UTF-8 BYTES, not UTF-16 code units, because bytes
 * are what actually occupy memory and disk — a `.length` cap would let a
 * string of astral-plane characters through at up to 2x the intended size.
 */

/**
 * Text entries: 610 bytes.
 *
 * Measurement: the longest phrase in `CURATED_PHRASE_BANK` is 61
 * characters ("The Statue of Liberty lighting a birthday cake with her
 * torch"), across 74 bank phrases. That is the only corpus of
 * known-good opening phrases this app has.
 *
 * Derivation: 61 x 10. A player write-in should be able to run
 * comfortably longer than the longest curated phrase — an order of
 * magnitude of headroom means no realistic sentence a player types is
 * ever refused — while still bounding the durable Curation Store, which
 * stores this text verbatim and forever.
 */
export const MAX_TEXT_ENTRY_BYTES = 610;

/**
 * Drawing entries: 2,830,862 bytes (~2.7 MiB).
 *
 * Measurement: `DrawingCanvas.svelte` captures one `Point` per
 * `pointermove` with NO throttling, NO simplification, and NO coordinate
 * rounding — `toPoint()` produces full-precision floats like
 * `123.45678901234567`. Serialized, that costs ~47 bytes per point, which
 * is what makes drawing payloads large. Synthesized payloads (the real
 * test fixtures are 2-3 points, far too small to be "realistic") measured
 * through `JSON.stringify`:
 *
 *   typical doodle    20 strokes x  80 pts +  3 fills =    1,600 pts ->    76 KB
 *   detailed          60 strokes x 150 pts +  8 fills =    9,000 pts ->   426 KB
 *   very dense       120 strokes x 250 pts + 15 fills =   30,000 pts -> 1,415,431 B
 *   extreme          200 strokes x 400 pts + 20 fills =   80,000 pts -> 3.6 MB
 *
 * Derivation: 1,415,431 x 2 — twice the VERY DENSE case, which is already
 * a far more elaborate drawing than this game's short turns produce. The
 * doubling is the margin.
 *
 * Why not higher, to also admit the "extreme" row: that row is ~3 minutes
 * of CONTINUOUS unbroken scribbling, past the point of being a realistic
 * turn, and admitting it would cost more than it buys. Drawings never
 * reach the Curation Store — only phrases and ratings do — so this cap's
 * only job is protecting in-memory room state (datamodel.md Overview), and
 * that state runs on a 512 MB Fly machine (`[[vm]] memory` in `fly.toml`
 * and `fly.staging.toml`). A room holds players x laps drawing entries at
 * once, so a cap set generously enough for the extreme case would let a
 * handful of full rooms exhaust the machine. Rejecting the extreme case is
 * therefore deliberate, not an oversight.
 */
export const MAX_DRAWING_ENTRY_BYTES = 2_830_862;

/** The byte cap for an entry of the given type — keyed on the SERVER's computed type. */
export function maxEntryBytesFor(type: 'text' | 'drawing'): number {
  return type === 'drawing' ? MAX_DRAWING_ENTRY_BYTES : MAX_TEXT_ENTRY_BYTES;
}

/**
 * True when `content` exceeds the cap for its type. Oversize content is
 * REJECTED by the caller, never truncated: silently discarding half a
 * drawing while telling the player their turn succeeded is the one
 * outcome worse than refusing it.
 */
export function exceedsEntryContentLimit(content: string, type: 'text' | 'drawing'): boolean {
  return entryContentBytes(content) > maxEntryBytesFor(type);
}

/**
 * UTF-8 byte length, computed from code points rather than via
 * `Buffer.byteLength` (absent in the client bundle) or `TextEncoder`
 * (which would force a `DOM` lib into this package's tsconfig for one
 * call). Pure arithmetic keeps this module dependency-free and usable
 * identically on both sides of the wire.
 */
export function entryContentBytes(content: string): number {
  let bytes = 0;
  for (const character of content) {
    const codePoint = character.codePointAt(0)!;
    if (codePoint < 0x80) bytes += 1;
    else if (codePoint < 0x800) bytes += 2;
    else if (codePoint < 0x10000) bytes += 3;
    else bytes += 4;
  }
  return bytes;
}
