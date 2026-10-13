/**
 * Translation node injection (Sprint 4 + 4.1, ADR-002 + ADR-004).
 *
 * Never modify original elements and never rewrite container innerHTML.
 * - Final translation: a SIBLING span right after the anchor block
 *   (via `parentNode.insertBefore`), styled to MATCH the original
 *   paragraph's typography and layout width (table cells: appended
 *   inside, a span inside <tr> would break table layout).
 * - In-flight translation: a small SPINNING CIRCLE appended at the very
 *   end of the paragraph (replaced by the translation when it lands).
 */

import { INJECTED_CLASS } from './dom-parser';

const STYLE_ELEMENT_ID = 'twin-read-style';
const SPINNER_KEYFRAMES = '@keyframes twin-read-spin{to{transform:rotate(360deg)}}';

/** Subtle color so the original text stays visually primary. */
const TRANSLATION_COLOR = '#64748b';

/** Typography properties copied from the original so both texts look alike. */
const TEXT_STYLE_PROPS = [
  'font-family',
  'font-size',
  'font-weight',
  'line-height',
  'letter-spacing',
  'word-spacing',
  'text-align',
  'text-transform',
] as const;

/** Horizontal layout properties so the translation lines up with the original. */
const LAYOUT_PROPS = [
  'margin-top',
  'margin-bottom',
  'margin-left',
  'margin-right',
  'padding-left',
  'padding-right',
  'max-width',
  'box-sizing',
] as const;

const BOX_PROPS = [...TEXT_STYLE_PROPS, ...LAYOUT_PROPS] as const;

/** Inject the spinner keyframes stylesheet once (namespaced, tiny). */
function ensureSpinnerStyles(): void {
  if (document.getElementById(STYLE_ELEMENT_ID) !== null) return;
  const style = document.createElement('style');
  style.id = STYLE_ELEMENT_ID;
  style.textContent = SPINNER_KEYFRAMES;
  document.head.appendChild(style);
}

function isTableCell(element: Element): boolean {
  const tag = element.tagName.toLowerCase();
  return tag === 'td' || tag === 'th';
}

/** Copy the anchor's typography + horizontal layout onto the translation span. */
function matchOriginalTypography(span: HTMLSpanElement, anchor: Element): void {
  const computed = window.getComputedStyle(anchor);
  for (const prop of BOX_PROPS) {
    const value = computed.getPropertyValue(prop);
    if (value !== '') span.style.setProperty(prop, value);
  }
  const width = computed.getPropertyValue('width');
  if (width !== '' && width !== 'auto') span.style.width = width;
  span.style.display = 'block';
  span.style.marginTop = '0.25em';
  span.style.color = TRANSLATION_COLOR;
}

/** Insert the translated text right after the anchor block (ADR-002 / ADR-004). */
export function insertTranslationAfter(anchor: Element, translated: string): void {
  const trimmed = translated.trim();
  if (trimmed.length === 0) return;

  const span = document.createElement('span');
  span.className = INJECTED_CLASS;
  span.textContent = trimmed;
  matchOriginalTypography(span, anchor);

  // Table cells: a sibling span inside a <tr> breaks table layout — append inside.
  if (isTableCell(anchor)) {
    anchor.appendChild(span);
    return;
  }
  const parent = anchor.parentNode;
  if (parent === null) return; // detached anchor: the page changed under us
  parent.insertBefore(span, anchor.nextSibling);
}

/** Append a small spinning circle at the very end of the paragraph. */
export function appendPendingSpinner(anchor: Element): HTMLSpanElement {
  ensureSpinnerStyles();

  const span = document.createElement('span');
  span.className = `${INJECTED_CLASS} twin-read-spinner`;
  span.title = 'Twin Read 正在翻译';
  span.style.display = 'inline-block';
  span.style.width = '0.7em';
  span.style.height = '0.7em';
  span.style.marginLeft = '0.25em';
  span.style.borderRadius = '50%';
  span.style.border = '2px solid currentColor'; // adapts to the paragraph color
  span.style.borderRightColor = 'transparent';
  span.style.opacity = '0.45';
  span.style.animation = 'twin-read-spin 0.8s linear infinite';
  anchor.appendChild(span);
  return span;
}

/** Replace a spinner with a small failure glyph (kept visible for retry). */
export function markSpinnerFailed(span: HTMLSpanElement): void {
  span.className = `${INJECTED_CLASS} twin-read-failed`;
  span.removeAttribute('title');
  span.style.cssText = '';
  span.textContent = '⚠';
  span.style.marginLeft = '0.25em';
  span.style.opacity = '0.8';
  span.style.color = '#dc2626';
}

/** Remove every injected span (translations and spinners). */
export function removeAllTranslations(root: Document | Element): number {
  const spans = root.querySelectorAll(`span.${INJECTED_CLASS}`);
  spans.forEach((span) => span.remove());
  return spans.length;
}
