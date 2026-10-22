import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative paths, so the built site works from a folder — GitHub Pages
  // serves it at /Condiment-Sauce-Counter-West-Adams-CFA/, not at the root.
  base: './',
  build: { outDir: 'dist' },
});
