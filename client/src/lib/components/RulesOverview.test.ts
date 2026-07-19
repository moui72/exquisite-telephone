import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import RulesOverview from './RulesOverview.svelte';

afterEach(() => cleanup());

describe('RulesOverview', () => {
  it('explains the core game loop', () => {
    render(RulesOverview, { props: { onClose: vi.fn() } });

    expect(screen.getByText(/write a phrase/i)).toBeInTheDocument();
    expect(screen.getByText(/never having seen the original/i)).toBeInTheDocument();
    expect(screen.getByText(/reveal/i)).toBeInTheDocument();
  });

  it('calls onClose when the dismiss control is activated', async () => {
    const onClose = vi.fn();
    render(RulesOverview, { props: { onClose } });

    await fireEvent.click(screen.getByRole('button', { name: /close|dismiss/i }));

    expect(onClose).toHaveBeenCalled();
  });
});
