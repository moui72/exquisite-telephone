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

  it('calls onClose when the dismiss control is activated', async () => {
    const onClose = vi.fn();
    render(RulesOverview, { props: { onClose } });

    await fireEvent.click(screen.getByRole('button', { name: /close|dismiss/i }));

    expect(onClose).toHaveBeenCalled();
  });
});
