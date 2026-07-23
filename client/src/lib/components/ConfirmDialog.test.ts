import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'svelte';
import ConfirmDialog from './ConfirmDialog.svelte';

// T001 red-first: ConfirmDialog is only a stub here (Vite resolves the
// import at build time, so the file must exist), so every assertion below
// throws and each test is marked `it.fails` to keep the full-suite
// pre-commit hook green. T002 implements the component and flips every
// `it.fails` back to `it` so the specs run and pass for real.
function renderConfirmDialog(props: Partial<ComponentProps<ConfirmDialog>>) {
  return render(ConfirmDialog, { props: { ...baseProps, ...props } });
}

const baseProps: ComponentProps<ConfirmDialog> = {
  heading: 'End the game for everyone?',
  body: 'This cannot be undone.',
  confirmLabel: 'End game',
  cancelLabel: 'Keep playing',
  onConfirm: () => {},
  onCancel: () => {},
};

afterEach(() => cleanup());

describe('ConfirmDialog (shared confirmation modal)', () => {
  it.fails('renders the caller-supplied heading, body, confirm and cancel labels', async () => {
    await renderConfirmDialog(baseProps);

    expect(screen.getByText('End the game for everyone?')).toBeInTheDocument();
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'End game' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep playing' })).toBeInTheDocument();
  });

  it.fails('calls onConfirm when the confirm control is clicked', async () => {
    const onConfirm = vi.fn();
    await renderConfirmDialog({ ...baseProps, onConfirm });

    await fireEvent.click(screen.getByRole('button', { name: 'End game' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it.fails('calls onCancel when the cancel control is clicked', async () => {
    const onCancel = vi.fn();
    await renderConfirmDialog({ ...baseProps, onCancel });

    await fireEvent.click(screen.getByRole('button', { name: 'Keep playing' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it.fails('calls onCancel when Escape is pressed', async () => {
    const onCancel = vi.fn();
    await renderConfirmDialog({ ...baseProps, onCancel });

    await fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it.fails('renders as an alertdialog with aria-modal', async () => {
    await renderConfirmDialog(baseProps);

    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it.fails('places initial focus on the cancel control', async () => {
    await renderConfirmDialog(baseProps);

    expect(screen.getByRole('button', { name: 'Keep playing' })).toHaveFocus();
  });

  it.fails('applies the destructive styling class to the confirm action when destructive', async () => {
    await renderConfirmDialog({ ...baseProps, destructive: true });

    expect(screen.getByRole('button', { name: 'End game' }).className).toContain(
      'confirm-destructive',
    );
  });

  it.fails('does not apply the destructive class to the confirm action by default', async () => {
    await renderConfirmDialog(baseProps);

    expect(screen.getByRole('button', { name: 'End game' }).className).not.toContain(
      'confirm-destructive',
    );
  });
});
