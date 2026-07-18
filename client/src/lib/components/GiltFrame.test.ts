import { cleanup, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import GiltFrameTestHost from './GiltFrameTestHost.svelte';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function stubMatchMedia(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
}

describe('GiltFrame (signature ornate frame + engraved plaque component)', () => {
  it('renders its default slot content', () => {
    stubMatchMedia(false);
    render(GiltFrameTestHost, { props: { caption: 'Exhibit No. 1' } });

    expect(screen.getByText('hello from inside the frame')).toBeInTheDocument();
  });

  it('renders the caption prop as visible plaque text', () => {
    stubMatchMedia(false);
    render(GiltFrameTestHost, { props: { caption: 'Exhibit No. 7 — Untitled' } });

    expect(screen.getByText('Exhibit No. 7 — Untitled')).toBeInTheDocument();
  });

  it('omits the decorative-motion class when prefers-reduced-motion is set', () => {
    stubMatchMedia(true);
    const { container } = render(GiltFrameTestHost, { props: { caption: 'Exhibit No. 2' } });

    expect(container.querySelector('.gilt-frame-motion')).not.toBeInTheDocument();
  });

  it('includes the decorative-motion class when motion is not reduced', () => {
    stubMatchMedia(false);
    const { container } = render(GiltFrameTestHost, { props: { caption: 'Exhibit No. 3' } });

    expect(container.querySelector('.gilt-frame-motion')).toBeInTheDocument();
  });
});
