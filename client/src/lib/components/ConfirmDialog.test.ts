import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'svelte';
import ConfirmDialog from './ConfirmDialog.svelte';

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
  it('renders the caller-supplied heading, body, confirm and cancel labels', async () => {
    await renderConfirmDialog(baseProps);

    expect(screen.getByText('End the game for everyone?')).toBeInTheDocument();
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'End game' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep playing' })).toBeInTheDocument();
  });

  it('calls onConfirm when the confirm control is clicked', async () => {
    const onConfirm = vi.fn();
    await renderConfirmDialog({ ...baseProps, onConfirm });

    await fireEvent.click(screen.getByRole('button', { name: 'End game' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when the cancel control is clicked', async () => {
    const onCancel = vi.fn();
    await renderConfirmDialog({ ...baseProps, onCancel });

    await fireEvent.click(screen.getByRole('button', { name: 'Keep playing' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when Escape is pressed', async () => {
    const onCancel = vi.fn();
    await renderConfirmDialog({ ...baseProps, onCancel });

    await fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('renders as an alertdialog with aria-modal', async () => {
    await renderConfirmDialog(baseProps);

    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('places initial focus on the cancel control', async () => {
    await renderConfirmDialog(baseProps);

    expect(screen.getByRole('button', { name: 'Keep playing' })).toHaveFocus();
  });

  it('applies the destructive styling class to the confirm action when destructive', async () => {
    await renderConfirmDialog({ ...baseProps, destructive: true });

    expect(screen.getByRole('button', { name: 'End game' }).className).toContain(
      'confirm-destructive',
    );
  });

  it('does not apply the destructive class to the confirm action by default', async () => {
    await renderConfirmDialog(baseProps);

    expect(screen.getByRole('button', { name: 'End game' }).className).not.toContain(
      'confirm-destructive',
    );
  });
});
