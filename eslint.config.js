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
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // TS code is type-checked by tsc; no-undef produces false positives for chrome.* etc.
    files: ['**/*.ts'],
    rules: { 'no-undef': 'off' },
  },
  {
    // Node-flavored config files (dependency-cruiser, etc.)
    files: ['*.cjs'],
    languageOptions: {
      globals: { ...globals.node, ...globals.commonjs },
    },
  },
);
