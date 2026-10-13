import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json' with { type: 'json' };

export default defineConfig({
  plugins: [crx({ manifest })],
  resolve: {
    alias: {
      '@shared': './packages/shared',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
