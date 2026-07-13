import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Absolute base: assets must resolve from the domain root, or nested routes
  // like /upi/ would request /upi/assets/… (404, unstyled page). The site is
  // always served from the root of theqr.studio.
  base: '/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    target: 'es2020',
  },
});
