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
        display: ['Fraunces', 'serif'],
        body: ['Rubik', 'sans-serif'],
        mono: ['"Space Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
