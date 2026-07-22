/**
 * Display-safety sanitizer for verbatim, untrusted player text
 * (datamodel.md Consolidated view sanitization; infrastructure.md
 * Aggregation Pipe — Sanitize for display).
 *
 * This is an OUTPUT transform only. No caller may apply it to the fold's
 * exact-text dedup key: the fold keeps near-miss wordings distinct on
 * purpose, and normalizing the key would silently merge them.
 */
export function sanitizeForDisplay(phrase: string): string {
  void phrase;
  throw new Error('sanitizeForDisplay not implemented');
}
