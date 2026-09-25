import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // En dev, les appels /api sont relayés vers le serveur Hono.
    proxy: { '/api': 'http://127.0.0.1:3000' },
  },
});
