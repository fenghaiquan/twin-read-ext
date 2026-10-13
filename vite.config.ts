import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json' with { type: 'json' };

/** Resolve a project-relative path to an absolute one (required by Vite aliases). */
const toAbsolute = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  plugins: [crx({ manifest })],
  resolve: {
    alias: {
      '@shared': toAbsolute('./packages/shared'),
      '@core-llm': toAbsolute('./packages/core-llm'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
