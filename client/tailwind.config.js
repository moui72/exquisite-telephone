/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{svelte,ts,js}'],
  theme: {
    extend: {
      // Boudoir Damask palette (redesign 2026-07-23). Each token's name is its
      // colour; the role each one plays across the app:
      //   bordeaux  — the page ground ("the wall"), a gold fleur damask on it
      //               (set once in app.css, not as a utility)
      //   champagne — every light surface (gilt frames, plaques) and
      //               light-text-on-the-dark-ground
      //   ink       — the darkest text, on champagne surfaces
      //   gold      — frames, rings, and decorative accents
      //   sapphire  — the interactive accent (buttons, links, focus)
      //   wine      — deep-wine dark elements (chips, modal scrims, the footer)
      //   emerald   — success ("piece presented", encore)
      colors: {
        ink: '#3A1017',
        wine: '#4E1420',
        gold: '#D0A84E',
        sapphire: '#2B4A8C',
        champagne: '#F3E6C4',
        emerald: '#2F6B46',
        bordeaux: '#6E1F2E',
      },
      fontFamily: {
        // Metric-aware fallback stacks: when Fraunces/Rubik/Space Mono
        // haven't loaded yet (or are blocked), the next face in each
        // stack is chosen for a close x-height/width match so layout
        // doesn't visibly reflow once webfonts swap in.
        display: [
          'Fraunces',
          'Iowan Old Style',
          'Georgia',
          'ui-serif',
          'serif',
        ],
        // Splash-title only (the "Exquisite Telephone" mark in Lobby/Reveal) —
        // Pirata One, a gothic blackletter self-hosted via
        // @fontsource/pirata-one (imported in main.ts). Falls back through
        // `display` rather than a generic `cursive` (unreliably mapped across
        // browsers/OSes), so an unloaded face still lands on a characterful
        // serif, not a random system script face.
        title: [
          '"Pirata One"',
          'Fraunces',
          'Iowan Old Style',
          'Georgia',
          'ui-serif',
          'serif',
        ],
        body: [
          'Rubik',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'ui-sans-serif',
          'sans-serif',
        ],
        mono: [
          '"Space Mono"',
          '"SF Mono"',
          'Menlo',
          'Consolas',
          'ui-monospace',
          'monospace',
        ],
      },
    },
  },
  plugins: [],
};
