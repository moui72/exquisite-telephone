import { cleanup, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SalonFooter from './SalonFooter.svelte';

afterEach(() => cleanup());

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
