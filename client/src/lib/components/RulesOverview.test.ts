import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import RulesOverview from './RulesOverview.svelte';

afterEach(() => cleanup());

describe('RulesOverview', () => {
  it('explains the core game loop', () => {
    render(RulesOverview, { props: { onClose: vi.fn() } });

    expect(screen.getByText(/an opening phrase/i)).toBeInTheDocument();
    expect(screen.getByText(/never having seen the original/i)).toBeInTheDocument();
    expect(screen.getByText(/reveal/i)).toBeInTheDocument();
  });

  it('describes the opening turn in a way that holds in both prompt modes', () => {
    const { container } = render(RulesOverview, { props: { onClose: vi.fn() } });
    const copy = container.textContent ?? '';

    // Curated mode deals a hand to pick from (WritingDrawing.svelte), so any
    // claim that the opening phrase is freely authored is false there.
    expect(copy).toMatch(/chooses|choose|settles on|picks/i);
    expect(copy).not.toMatch(/anything they like/i);
  });

  /**
   * Regression guard for the class of bug fixed in T002: the panel is a
   * single piece of copy shown to every player, but `Room.promptMode`
   * makes the opening turn work two different ways. Any sentence that
   * presupposes one mode is false for players in the other.
   *
   * Deliberately structural, not pinned to wording (plan Complexity
   * Tracking): it lists phrasings that *presuppose* a mode rather than
   * asserting the current sentence, so ordinary copy edits pass and only
   * a reintroduced mode-specific claim fails.
   */
  it('makes no claim that presupposes one prompt mode', () => {
    const { container } = render(RulesOverview, { props: { onClose: vi.fn() } });
    const copy = (container.textContent ?? '').replace(/\s+/g, ' ');

    const presupposesFreeForm = [
      /anything they (?:like|want|please)/i,
      /whatever they (?:like|want|please)/i,
      /(?:invent|compose|write|think up)s? (?:any|their own) phrase/i,
      /blank page and asked to write/i,
    ];
    const presupposesCurated = [
      /(?:must|has to|have to) (?:pick|choose) from/i,
      /handed a hand of phrases/i,
      /no writing of their own/i,
    ];

    for (const pattern of [...presupposesFreeForm, ...presupposesCurated]) {
      expect(copy, `rules copy makes a prompt-mode-specific claim: ${pattern}`).not.toMatch(
        pattern,
      );
    }
  });

  /**
   * T012 — the panel must cover what changes the SHAPE of a game (T011
   * decision): how many laps a book runs, that an opening phrase may be
   * dealt rather than written, and that a turn may be timed. Per-setting
   * detail stays with the Lobby tooltips.
   */
  it('covers the shipped features that change the shape of a game', () => {
    const { container } = render(RulesOverview, { props: { onClose: vi.fn() } });
    const copy = (container.textContent ?? '').replace(/\s+/g, ' ');

    expect(copy).toMatch(/lap/i);
    // T013 — `Room.lapsPerBook` is 1..3 (datamodel.md Normalization Rules —
    // Laps per book; shared/src/types.ts), so the panel must not imply the
    // book goes round exactly once.
    expect(copy).toMatch(/three|3 laps/i);
    expect(copy).not.toMatch(/the book passes around the circle,/i);
    expect(copy).toMatch(/curated|dealt|deals/i);
    expect(copy).toMatch(/timer|timed|clock|time limit/i);
  });

  /**
   * The panel stays an OVERVIEW (T011). A panel nobody finishes reading
   * helps less than a short one, so length is asserted as a real budget —
   * generous enough not to fight ordinary edits, tight enough that
   * documenting every setting here would fail.
   */
  it('stays short enough to be read', () => {
    const { container } = render(RulesOverview, { props: { onClose: vi.fn() } });
    const words = (container.textContent ?? '').trim().split(/\s+/).length;

    expect(words).toBeLessThan(320);
  });

  /**
   * Prompt rating is deliberately NOT explained here — T004 placed that
   * explanation inline at the control, and a second copy would drift.
   */
  it('does not duplicate the inline prompt-rating explanation', () => {
    const { container } = render(RulesOverview, { props: { onClose: vi.fn() } });

    expect(container.textContent ?? '').not.toMatch(/thumbs|rate the phrase|anonymous/i);
  });

  it('calls onClose when the dismiss control is activated', async () => {
    const onClose = vi.fn();
    render(RulesOverview, { props: { onClose } });

    await fireEvent.click(screen.getByRole('button', { name: /close|dismiss/i }));

    expect(onClose).toHaveBeenCalled();
  });
});

describe('RulesOverview (T005: Rules + About tabs)', () => {
  it('renders Rules and About tabs with Rules selected by default', () => {
    render(RulesOverview, { props: { onClose: vi.fn() } });

    const rulesTab = screen.getByRole('tab', { name: /rules/i });
    const aboutTab = screen.getByRole('tab', { name: /about/i });

    // Rules is the initial view.
    expect(rulesTab).toHaveAttribute('aria-selected', 'true');
    expect(aboutTab).toHaveAttribute('aria-selected', 'false');

    // The rules copy is visible on open.
    expect(screen.getByText(/an opening phrase/i)).toBeInTheDocument();
  });

  it('switches to the About tab, revealing its panel and hiding the rules copy', async () => {
    render(RulesOverview, { props: { onClose: vi.fn() } });

    await fireEvent.click(screen.getByRole('tab', { name: /about/i }));

    expect(screen.getByRole('tab', { name: /about/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /rules/i })).toHaveAttribute('aria-selected', 'false');
    // Rules is the initial view, not the About view — its copy is gone once
    // About is selected (panels are conditionally rendered, not merely hidden).
    expect(screen.queryByText(/an opening phrase/i)).not.toBeInTheDocument();
  });
});

describe('RulesOverview (T007: About tab content)', () => {
  async function openAbout() {
    const rendered = render(RulesOverview, { props: { onClose: vi.fn() } });
    await fireEvent.click(screen.getByRole('tab', { name: /about/i }));
    return rendered;
  }

  it.fails('credits the three inspirations with a non-affiliation / trademark statement', async () => {
    const { container } = await openAbout();
    const copy = (container.textContent ?? '').replace(/\s+/g, ' ');

    expect(copy).toMatch(/exquisite corpse/i);
    expect(copy).toMatch(/telephone/i);
    expect(copy).toMatch(/telestrations/i);
    // Explicit trademark acknowledgment / non-affiliation wording.
    expect(copy).toMatch(/trademark/i);
    expect(copy).toMatch(/not affiliated|no affiliation|unaffiliated|not endorsed/i);
  });

  it.fails('links the repo and sponsor pages in a new tab with accessible labels', async () => {
    await openAbout();

    const repoLink = screen.getByRole('link', { name: /source|repo|repositor|github|code/i });
    expect(repoLink).toHaveAttribute('href', 'https://github.com/moui72/exquisite-telephone');
    expect(repoLink).toHaveAttribute('target', '_blank');
    expect(repoLink).toHaveAttribute('rel', expect.stringContaining('noopener'));

    const sponsorLink = screen.getByRole('link', { name: /sponsor|support|donate/i });
    expect(sponsorLink).toHaveAttribute('href', 'https://github.com/sponsors/moui72');
    expect(sponsorLink).toHaveAttribute('target', '_blank');
    expect(sponsorLink).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });
});
