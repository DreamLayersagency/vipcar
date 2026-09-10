import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Load VITE_* from the monorepo root `.env` (shared with gateway / services).
const monorepoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export default defineConfig({
  envDir: monorepoRoot,
  plugins: [react()],
  resolve: {
    // npm workspaces hoist deps to the monorepo root
    dedupe: ['react', 'react-dom', 'recharts'],
  },
  server: {
    port: 5173,
    host: true,
    fs: {
      allow: [monorepoRoot],
    },
  },
  optimizeDeps: {
    include: ['recharts'],
  },
  preview: {
    port: 4173,
    host: '127.0.0.1',
  },
});
