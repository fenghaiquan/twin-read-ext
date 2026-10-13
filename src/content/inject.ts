/**
 * Translation node injection (Sprint 4, ADR-002).
 *
 * Never modify original TextNodes and never rewrite container innerHTML.
 * Insert a sibling `<span class="twin-read-trans">` after each original
 * text node via `parentNode.insertBefore` so host frameworks (React/Vue)
 * keep their DOM-diff mappings intact.
 */

import { INJECTED_CLASS } from './dom-parser';

/** Inject translated texts as sibling spans; returns how many were injected. */
export function injectTranslations(nodes: Text[], translatedTexts: string[]): number {
  let injected = 0;
  for (const [index, node] of nodes.entries()) {
    const translated = (translatedTexts[index] ?? '').trim();
    const parent = node.parentNode;
    if (translated.length === 0 || parent === null) continue; // detached node: page changed

    const span = document.createElement('span');
    span.className = INJECTED_CLASS;
    span.textContent = translated;
    span.style.color = '#64748b'; // subtle contrast so the original text stays primary
    span.style.marginLeft = '0.3em';
    parent.insertBefore(span, node.nextSibling);
    injected += 1;
  }
  return injected;
}

/** Remove every injected translation span (restores the original page). */
export function removeAllTranslations(root: Document | Element): number {
  const spans = root.querySelectorAll(`span.${INJECTED_CLASS}`);
  spans.forEach((span) => span.remove());
  return spans.length;
}
