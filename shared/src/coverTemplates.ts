/**
 * The fixed set of pregenerated book-cover background templates
 * (datamodel.md Book.coverTemplate, ui.md Cover Decoration). A static
 * `shared/` constant like the phrase bank (constitution Principle VI) so
 * both server validation and client rendering read one source of truth.
 *
 * Exactly these nine ids — the id set is closed; adding one is an explicit
 * edit here, not something a client can invent. `Book.coverTemplate` is
 * `null` (blank canvas) or one of these.
 */
export const COVER_TEMPLATE_IDS = [
  'fan-deco',
  'damask-lattice',
  'marbled-endpaper',
  'star-chart',
  'herringbone-cloth',
  'halftone-bloom',
  'contour-field',
  'pennant-row',
  'houndstooth',
] as const;

/** One of the nine named cover-template ids. */
export type CoverTemplateId = (typeof COVER_TEMPLATE_IDS)[number];

/**
 * True when `id` is one of the nine known template ids. Narrows to
 * `CoverTemplateId`, so the server can reject a bogus `coverTemplate`
 * claim from a client at the `onSubmitCover` boundary and the client can
 * validate a picker selection.
 */
export function isCoverTemplateId(id: unknown): id is CoverTemplateId {
  return typeof id === 'string' && (COVER_TEMPLATE_IDS as readonly string[]).includes(id);
}
