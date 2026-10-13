import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/', 'coverage/', 'node_modules/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*', 'packages/**/*', 'tests/**/*', '*.config.ts'],
    languageOptions: {
      // Content/options/popup run in browser context; background is a service worker.
      globals: { ...globals.browser, ...globals.serviceworker },
    },
    rules: {
      // Constitution: cap function complexity to keep DOM traversal logic sane.
      complexity: ['error', 10],
    },
  },
  {
    // Node-flavored config files (dependency-cruiser, etc.)
    files: ['*.cjs'],
    languageOptions: {
      globals: { ...globals.node, ...globals.commonjs },
    },
  },
);
