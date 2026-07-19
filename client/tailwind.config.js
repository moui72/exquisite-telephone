/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{svelte,ts,js}'],
  theme: {
    extend: {
      colors: {
        ink: '#241B2F',
        velvet: '#2E1A47',
        marigold: '#F5A623',
        bubblegum: '#FF6F91',
        butter: '#FFF3D6',
        grass: '#2FA88A',
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
        // Splash-title only (Lobby.svelte's "Exquisite Telephone" mark) —
        // an uncial hand modeled on real illuminated-manuscript lettering.
        // Falls back through `display` rather than a generic `cursive`
        // (unreliably mapped across browsers/OSes), so an unloaded
        // Uncial Antiqua still lands on a characterful serif, not a
        // random system script face.
        title: [
          '"Uncial Antiqua"',
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
