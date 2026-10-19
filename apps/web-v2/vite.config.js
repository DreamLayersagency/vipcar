import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// View 2 is served under /v2/ on the demo origin, next to App 1 at /.
// VITE_* variables come from the monorepo root `.env`, shared with App 1 and the gateway.
const monorepoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export default defineConfig(({ command }) => {
  // The shared root `.env` sets NODE_ENV=development for the Nest services. Vite would adopt it
  // (via VITE_USER_NODE_ENV) and turn every `vite build` of this app into a development build.
  // Claiming the variable first keeps builds production-grade without touching the root `.env`.
  if (command === 'build' && process.env.VITE_USER_NODE_ENV === undefined) process.env.VITE_USER_NODE_ENV = '';
  return {
    base: '/v2/',
    envDir: monorepoRoot,
    plugins: [react()],
    server: {
      port: 5174,
      strictPort: true,
      host: true,
    },
    preview: {
      port: 4174,
      host: '127.0.0.1',
    },
  };
});
