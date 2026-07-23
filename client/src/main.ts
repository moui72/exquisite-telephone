import { mount } from 'svelte';
// Self-hosted title face (Boudoir Damask splash mark). Fontsource ships the
// @font-face + files, so it loads without the Google Fonts <link>.
import '@fontsource/pirata-one';
import './app.css';
import App from './App.svelte';

const app = mount(App, {
  target: document.getElementById('app')!,
});

export default app;
