import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import InfoTooltip from './InfoTooltip.svelte';

afterEach(() => cleanup());

describe('InfoTooltip', () => {
  it('hides the explanation until clicked, then reveals it on click', async () => {
    render(InfoTooltip, {
      props: { label: 'Laps per book', explanation: 'How many times each book passes around.' },
    });

    expect(screen.queryByText('How many times each book passes around.')).not.toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: /laps per book/i }));

    expect(screen.getByText('How many times each book passes around.')).toBeInTheDocument();
  });

  it('toggles the explanation back off on a second click', async () => {
    render(InfoTooltip, {
      props: { label: 'Laps per book', explanation: 'How many times each book passes around.' },
    });

    const toggle = screen.getByRole('button', { name: /laps per book/i });
    await fireEvent.click(toggle);
    await fireEvent.click(toggle);

    expect(screen.queryByText('How many times each book passes around.')).not.toBeInTheDocument();
  });
});
