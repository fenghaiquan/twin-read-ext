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
      name: 'shared-stays-pure',
      comment: 'packages/shared must not depend on extension implementation code.',
      severity: 'error',
      from: { path: '^packages/shared' },
      to: { path: '^src/' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.json' },
  },
};
