/**
 * Dependency rules ("constitution") enforced by `npm run depcruise`.
 *
 * Architecture invariants (see docs/adr):
 *  - content scripts must NOT import background internals; they may only
 *    communicate via chrome.runtime.sendMessage.
 *  - options/popup must NOT import background internals either.
 *  - packages/shared must stay pure: it must not depend on any module in src/.
 */
module.exports = {
  forbidden: [
    {
      name: 'content-not-import-background',
      comment:
        'Content scripts must talk to the background service worker via chrome.runtime.sendMessage, never direct imports.',
      severity: 'error',
      from: { path: '^src/content' },
      to: { path: '^src/background' },
    },
    {
      name: 'ui-not-import-background',
      comment:
        'Options/popup UI must not import background internals; use chrome.* APIs or message passing.',
      severity: 'error',
      from: { path: '^(src/options|src/popup)' },
      to: { path: '^src/background' },
    },
    {
      name: 'content-not-import-core-llm',
      comment:
        'Content scripts must not build prompts themselves; core-llm is only reachable via the background service worker.',
      severity: 'error',
      from: { path: '^src/content' },
      to: { path: '^packages/core-llm' },
    },
    {
      name: 'ui-not-import-core-llm',
      comment: 'Options/popup must not import core-llm; they talk to the provider only via the background service worker.',
      severity: 'error',
      from: { path: '^(src/options|src/popup)' },
      to: { path: '^packages/core-llm' },
    },
    {
      name: 'packages-stay-pure',
      comment: 'Shared type/LLM-logic packages must not depend on extension implementation code.',
      severity: 'error',
      from: { path: '^packages/' },
      to: { path: '^src/' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.json' },
  },
};
