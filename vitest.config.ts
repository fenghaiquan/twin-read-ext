import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/** Resolve a project-relative path to an absolute one (required by Vite aliases). */
const toAbsolute = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@shared': toAbsolute('./packages/shared'),
      '@core-llm': toAbsolute('./packages/core-llm'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
