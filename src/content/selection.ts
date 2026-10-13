/**
 * Selection extraction: turns the current window selection into a
 * TranslationRequest (type 'selection'), including the surrounding
 * block-level paragraph text as context for the LLM.
 *
 * Pure-ish DOM helpers are exported for unit testing; no chrome.* and
 * no network access here (constitution: content never talks to providers).
 */

import type { TranslationRequest } from '@shared/types';

export const MAX_SELECTION_LENGTH = 300;
export const MAX_CONTEXT_LENGTH = 1500;

const BLOCK_CONTEXT_TAGS = new Set([
  'p', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'blockquote', 'td', 'th', 'dd', 'dt', 'figcaption', 'pre', 'summary', 'caption',
]);

/** Build a selection TranslationRequest from the current selection, or null if unusable. */
export function buildSelectionRequest(): TranslationRequest | null {
  const selection = window.getSelection();
  if (selection === null || selection.isCollapsed) return null;
  const text = selection.toString().trim();
  if (!text || text.length > MAX_SELECTION_LENGTH) return null;
  return {
    id: crypto.randomUUID(),
    type: 'selection',
    texts: [text],
    context: extractContext(selection.anchorNode, document.body) ?? undefined,
  };
}

/** Extract the surrounding paragraph text for the given anchor node. */
export function extractContext(anchor: Node | null, boundary: Node | null): string | null {
  const element =
    findContextElement(anchor, boundary) ??
    (anchor instanceof Element ? anchor : anchor?.parentElement ?? null);
  if (element === null) return null;
  return truncateText(element.textContent ?? '', MAX_CONTEXT_LENGTH);
}

/** Walk up from anchor to the nearest block-level context element, stopping at boundary. */
export function findContextElement(anchor: Node | null, boundary: Node | null): Element | null {
  let current: Node | null = anchor;
  while (current !== null && current !== boundary) {
    if (current instanceof Element && BLOCK_CONTEXT_TAGS.has(current.tagName.toLowerCase())) {
      return current;
    }
    current = current.parentNode;
  }
  return null;
}

/** Normalize whitespace and cap the length so prompts stay small. */
export function truncateText(text: string, maxLength: number): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength)}…`;
}
