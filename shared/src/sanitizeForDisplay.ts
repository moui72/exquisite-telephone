/**
 * Display-safety sanitizer for verbatim, untrusted player text
 * (datamodel.md Consolidated view sanitization; infrastructure.md
 * Aggregation Pipe — Sanitize for display).
 *
 * This is an OUTPUT transform only. No caller may apply it to the fold's
 * exact-text dedup key: the fold keeps near-miss wordings distinct on
 * purpose, and normalizing the key would silently merge them.
 */

/**
 * The union of unsafe ranges, removed in a single pass:
 * - U+0000-U+001F  C0 control chars, including ESC (0x1B); newline/tab/CR
 *   fall in here too and go, since curation phrases are single-line.
 * - U+007F-U+009F  DEL plus the C1 control block.
 * - U+200B-U+200D, U+FEFF  zero-width chars (display spoofing).
 * - U+202A-U+202E, U+2066-U+2069  bidi override/isolate chars.
 *
 * Every target is in the BMP and outside the surrogate range, so a plain
 * removal never splits an astral-plane emoji's surrogate pair. Removal is
 * trivially idempotent — a sanitized string contains none of these, so a
 * second pass is a no-op.
 */
// eslint-disable-next-line no-control-regex -- stripping control chars is the point
const UNSAFE = /[\x00-\x1F\x7F-\x9F\u200B-\u200D\u202A-\u202E\u2066-\u2069\uFEFF]/g;

export function sanitizeForDisplay(phrase: string): string {
  return phrase.replace(UNSAFE, '');
}
