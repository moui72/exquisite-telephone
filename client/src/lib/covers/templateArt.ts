import { COVER_TEMPLATE_IDS, type CoverTemplateId } from '@exquisite-telephone/shared';

/**
 * Client-side rendering of the nine pregenerated cover-background templates
 * (ui.md Cover Decoration; datamodel.md Book.coverTemplate). The id set is
 * the single source of truth in `shared/`; this module maps each id to its
 * human label and a self-contained CSS `background` value (gradients and
 * inline-SVG data URIs — no external assets, so it works in the Reveal card
 * and the decoration canvas alike). Rendered at low opacity beneath the ink
 * so strokes stay legible.
 *
 * Resolves the plan's "template artwork" open question: lightweight
 * CSS/inline-SVG patterns keyed by CoverTemplateId, deliberately abstract
 * and low-contrast rather than detailed illustration — they are a backdrop,
 * not the artwork.
 */
export const COVER_TEMPLATE_LABELS: Record<CoverTemplateId, string> = {
  'fan-deco': 'Fan Deco',
  'damask-lattice': 'Damask Lattice',
  'marbled-endpaper': 'Marbled Endpaper',
  'star-chart': 'Star Chart',
  'herringbone-cloth': 'Herringbone Cloth',
  'halftone-bloom': 'Halftone Bloom',
  'contour-field': 'Contour Field',
  'pennant-row': 'Pennant Row',
  houndstooth: 'Houndstooth',
};

/** An option in the picker: the nine templates plus the leading "blank". */
export interface CoverTemplateOption {
  id: CoverTemplateId | null;
  label: string;
}

export const COVER_TEMPLATE_OPTIONS: CoverTemplateOption[] = [
  { id: null, label: 'Blank' },
  ...COVER_TEMPLATE_IDS.map((id) => ({ id, label: COVER_TEMPLATE_LABELS[id] })),
];

const MARIGOLD = '%23F5A623';
const VELVET = '%232E1A47';

/**
 * A self-contained CSS `background` value for a template. `null` (blank)
 * yields an empty string — no background layer.
 */
export function coverTemplateBackground(id: string | null): string {
  switch (id) {
    case 'fan-deco':
      return `repeating-radial-gradient(circle at 50% 100%, ${'#F5A623'} 0 2px, transparent 2px 22px)`;
    case 'damask-lattice':
      return `repeating-linear-gradient(45deg, #2E1A47 0 2px, transparent 2px 18px), repeating-linear-gradient(-45deg, #2E1A47 0 2px, transparent 2px 18px)`;
    case 'marbled-endpaper':
      return `repeating-linear-gradient(75deg, #F5A623 0 3px, #FF6F91 3px 7px, #2FA88A 7px 11px, transparent 11px 26px)`;
    case 'star-chart':
      return `radial-gradient(#2E1A47 1.5px, transparent 1.6px) 0 0 / 20px 20px`;
    case 'herringbone-cloth':
      return `repeating-linear-gradient(45deg, #2E1A47 0 2px, transparent 2px 10px), repeating-linear-gradient(135deg, #2E1A47 0 2px, transparent 2px 10px)`;
    case 'halftone-bloom':
      return `radial-gradient(#FF6F91 3px, transparent 3.4px) 0 0 / 22px 22px`;
    case 'contour-field':
      return `repeating-radial-gradient(circle at 30% 40%, #2FA88A 0 1.5px, transparent 1.6px 16px)`;
    case 'pennant-row':
      return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Cpolygon points='0,0 24,0 12,16' fill='${MARIGOLD}'/%3E%3C/svg%3E") 0 0 / 24px 24px`;
    case 'houndstooth':
      return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Cpath d='M0 0h12v12H0z M12 12h12v12H12z' fill='${VELVET}'/%3E%3C/svg%3E") 0 0 / 24px 24px`;
    default:
      return '';
  }
}
