/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{svelte,ts,js}'],
  theme: {
    extend: {
      // Boudoir Damask palette (redesign 2026-07-22). NOTE: the token NAMES
      // are legacy and no longer literal — `bubblegum` renders sapphire blue,
      // `grass` renders emerald, `butter` renders champagne. This is a
      // deliberate value-remap so the ~15-file usage set didn't need a rename
      // mid-iteration; a name-sweep is owed once the palette locks. Each name
      // kept its semantic ROLE, which is what makes the remap safe:
      //   ink       — the darkest text / dark footer end
      //   velvet    — deep-wine dark elements (chips, headings-on-light)
      //   marigold  — gold (frames, rings, decorative accents)
      //   bubblegum — sapphire, the interactive accent (buttons, links, focus)
      //   butter    — champagne, every light surface and light-text-on-dark
      //   grass     — emerald success
      //   bordeaux  — NEW: the page ground ("the wall"), set once in app.css
      colors: {
        ink: '#3A1017',
        velvet: '#4E1420',
        marigold: '#D0A84E',
        bubblegum: '#2B4A8C',
        butter: '#F3E6C4',
        grass: '#2F6B46',
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
        // Manufacturing Consent, a display face self-hosted via
        // @fontsource/manufacturing-consent (imported in main.ts). Falls back
        // through `display` rather than a generic `cursive` (unreliably mapped
        // across browsers/OSes), so an unloaded face still lands on a
        // characterful serif, not a random system script face.
        title: [
          '"Manufacturing Consent"',
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
