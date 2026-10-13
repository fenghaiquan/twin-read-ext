/**
 * Translation node injection (Sprint 4 + 4.1, ADR-002 + ADR-004).
 *
 * Never modify original elements and never rewrite container innerHTML.
 * Insert a sibling `<span class="twin-read-trans">` after each block element
 * (or original text node) via `parentNode.insertBefore` so host frameworks
 * (React/Vue) keep their DOM-diff mappings intact.
 *
 * Sprint 4.1 upgrade: block-level anchor injection with pending markers (ADR-004)
 */

import { INJECTED_CLASS } from './dom-parser';

const PENDING_TEXT = '… 翻译中';
const FAILED_TEXT = '⚠ 翻译失败';

/** Common inline styles for translation spans (display: block for line break below). */
const SPAN_STYLES: Partial<CSSStyleDeclaration> = {
  display: 'block',
  marginTop: '0.25em',
  color: '#64748b',
  fontStyle: 'italic',
  fontSize: '0.95em',
};

/** Apply common styles to a span element. */
function applySpanStyles(span: HTMLSpanElement): void {
  Object.assign(span.style, SPAN_STYLES);
}

/** Insert a translation span after an anchor element (block or text node). */
export function insertTranslationAfter(anchor: Element | Text, translated: string): void {
  const trimmed = translated.trim();
  if (trimmed.length === 0) return;

  const parent = anchor.parentNode;
  if (parent === null) return;

  const span = document.createElement('span');
  span.className = INJECTED_CLASS;
  span.textContent = trimmed;
  applySpanStyles(span);

  parent.insertBefore(span, anchor.nextSibling);
}

/**
 * Insert a pending marker span after an anchor element.
 * Returns the span reference for later finalization.
 */
export function insertPendingAfter(anchor: Element | Text): HTMLSpanElement {
  const parent = anchor.parentNode;
  if (parent === null) {
    throw new Error('Cannot insert pending: anchor has no parent');
  }

  const span = document.createElement('span');
  span.className = `${INJECTED_CLASS} twin-read-pending`;
  span.textContent = PENDING_TEXT;
  applySpanStyles(span);
  span.style.opacity = '0.6';

  parent.insertBefore(span, anchor.nextSibling);
  return span;
}

/** Finalize a pending span with the actual translation. */
export function finalizePending(span: HTMLSpanElement, translated: string): void {
  span.textContent = translated.trim();
  span.classList.remove('twin-read-pending');
  span.style.opacity = '1';
  span.style.fontStyle = 'normal';
}

/** Mark a pending span as failed. */
export function markFailed(span: HTMLSpanElement): void {
  span.textContent = FAILED_TEXT;
  span.classList.remove('twin-read-pending');
  span.classList.add('twin-read-failed');
  span.style.opacity = '0.7';
  span.style.fontStyle = 'normal';
  span.style.color = '#991b1b';
}

/** Inject translated texts after each anchor element; returns how many were injected. */
export function injectTranslations(anchors: Array<Element | Text>, translatedTexts: string[]): number {
  let injected = 0;
  for (const [index, anchor] of anchors.entries()) {
    const translated = (translatedTexts[index] ?? '').trim();
    if (translated.length === 0) continue;
    if (anchor.parentNode === null) continue; // detached node: skip before counting
    insertTranslationAfter(anchor, translated);
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
