import { cleanup, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { APP_VERSION } from '../appVersion';
import SalonFooter from './SalonFooter.svelte';

afterEach(() => cleanup());

describe('SalonFooter — app version stamp', () => {
  it.fails('renders the app-version constant as plain text, not a link or control', () => {
    render(SalonFooter, {
      props: {
        onShowRules: vi.fn(),
        onShowModeration: vi.fn(),
        roomCode: 'ABCDE',
      },
    });

    // The build constant itself is shown (infrastructure.md App Versioning),
    // e.g. `v0.1.0-dev` in a bare test run.
    const stamp = screen.getByText(APP_VERSION);
    expect(stamp).toBeInTheDocument();

    // Readable text, not a link or a control ([[ui]] Salon Footer): the
    // element carrying the version is neither an anchor nor a button.
    expect(stamp.closest('a')).toBeNull();
    expect(stamp.closest('button')).toBeNull();
    expect(stamp).not.toHaveAttribute('role');
  });

  it.fails('stamps the version small and muted in the utility Space Mono face', () => {
    render(SalonFooter, {
      props: {
        onShowRules: vi.fn(),
        onShowModeration: vi.fn(),
        roomCode: 'ABCDE',
      },
    });

    const stamp = screen.getByText(APP_VERSION);
    // Space Mono is the app's `font-mono` face; small + muted per [[ui]].
    expect(stamp.className).toMatch(/font-mono/);
    expect(stamp.className).toMatch(/text-\[?(?:2xs|xs)/);
  });
});

describe('SalonFooter — frozen-room signal on the gavel', () => {
  it("names the gavel as 'the salon cannot continue' when nonContinuable is true", () => {
    render(SalonFooter, {
      props: {
        onShowRules: vi.fn(),
        onShowModeration: vi.fn(),
        roomCode: 'ABCDE',
        nonContinuable: true,
      },
    });

    // The accessible name must state the room can't continue, not merely
    // that moderation exists ([[ui]] Moderation Panel).
    expect(screen.getByRole('button', { name: /cannot continue/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Moderation$/ })).not.toBeInTheDocument();
  });

  it('conveys the frozen room by more than colour alone', () => {
    const { container } = render(SalonFooter, {
      props: {
        onShowRules: vi.fn(),
        onShowModeration: vi.fn(),
        roomCode: 'ABCDE',
        nonContinuable: true,
      },
    });

    // Baseline Accessibility ([[constitution]]): a rendered mark, not just a
    // recoloured icon.
    expect(container.querySelector('[data-frozen-mark]')).toBeInTheDocument();
  });

  it('leaves the gavel as the plain Moderation button when nonContinuable is false', () => {
    const { container } = render(SalonFooter, {
      props: {
        onShowRules: vi.fn(),
        onShowModeration: vi.fn(),
        roomCode: 'ABCDE',
        nonContinuable: false,
      },
    });

    expect(screen.getByRole('button', { name: 'Moderation' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /cannot continue/i })).not.toBeInTheDocument();
    expect(container.querySelector('[data-frozen-mark]')).not.toBeInTheDocument();
  });
});
