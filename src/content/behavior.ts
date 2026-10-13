/**
 * Selection-mode behavior switch (Options「行为」tab).
 *
 * The content script keeps a module-level `selectionEnabled` flag: `false`
 * means mouseup selections are ignored entirely (no dot, no request).
 * This tolerant reader defaults to ON for any malformed storage value so
 * dirty data can never silently disable the user's feature.
 */

export function readSelectionEnabled(raw: unknown): boolean {
  if (typeof raw !== 'object' || raw === null) return true;
  const value = (raw as { selectionEnabled?: unknown }).selectionEnabled;
  return typeof value === 'boolean' ? value : true;
}
