import { describe, expect, it } from 'vitest';
import { COVER_TEMPLATE_IDS, isCoverTemplateId, type CoverTemplateId } from './index.js';

describe('cover-template constant (datamodel.md Book.coverTemplate)', () => {
  it('is exactly the nine named ids, in order', () => {
    expect([...COVER_TEMPLATE_IDS]).toEqual([
      'fan-deco',
      'damask-lattice',
      'marbled-endpaper',
      'star-chart',
      'herringbone-cloth',
      'halftone-bloom',
      'contour-field',
      'pennant-row',
      'houndstooth',
    ]);
    expect(COVER_TEMPLATE_IDS).toHaveLength(9);
    // No duplicates.
    expect(new Set(COVER_TEMPLATE_IDS).size).toBe(9);
  });

  it('isCoverTemplateId accepts every member', () => {
    for (const id of COVER_TEMPLATE_IDS) {
      expect(isCoverTemplateId(id)).toBe(true);
    }
  });

  it('isCoverTemplateId rejects non-members, non-strings, and blank', () => {
    expect(isCoverTemplateId('blank')).toBe(false);
    expect(isCoverTemplateId('houndstoot')).toBe(false);
    expect(isCoverTemplateId('')).toBe(false);
    expect(isCoverTemplateId(null)).toBe(false);
    expect(isCoverTemplateId(undefined)).toBe(false);
    expect(isCoverTemplateId(3)).toBe(false);
  });

  it('narrows to CoverTemplateId when it returns true', () => {
    const candidate: unknown = 'star-chart';
    if (isCoverTemplateId(candidate)) {
      const narrowed: CoverTemplateId = candidate;
      expect(narrowed).toBe('star-chart');
    } else {
      throw new Error('expected star-chart to be a valid template id');
    }
  });
});
