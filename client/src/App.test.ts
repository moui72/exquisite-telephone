import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import App from './App.svelte';

describe('App placeholder route', () => {
  it('renders the app title', () => {
    render(App);
    expect(screen.getByRole('heading', { name: 'Exquisite Telephone' })).toBeInTheDocument();
  });
});
