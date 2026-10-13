/**
 * Pure DOM traversal for full-page translation (Sprint 3, TDD).
 *
 * Extracts translatable Text nodes WITHOUT modifying the DOM (ADR-002).
 * Skip rules:
 * - non-content tags (script/style/code/pre/...)
 * - elements hidden via the hidden attribute or inline display/visibility
 * - nodes injected by us in a previous translation pass (INJECTED_CLASS)
 * - blank / digit-or-symbol-only text
 */

/** Class applied to injected translation nodes (must match ADR-002). */
export const INJECTED_CLASS = 'twin-read-trans';

export const SKIP_TAGS: ReadonlySet<string> = new Set([
  'script', 'style', 'code', 'pre', 'kbd', 'samp', 'noscript',
  'textarea', 'template', 'svg', 'math', 'iframe',
]);

/** True if the element (and its whole subtree) must not be translated. */
export function isSkippedElement(element: Element): boolean {
  if (SKIP_TAGS.has(element.tagName.toLowerCase())) return true;
  if (element.classList.contains(INJECTED_CLASS)) return true;
  // hidden/style live on HTMLElement only (SVG elements are plain Elements)
  if (element instanceof HTMLElement) {
    if (element.hidden) return true;
    const { display, visibility } = element.style;
    if (display === 'none' || visibility === 'hidden') return true;
  }
  return false;
}

/** True if the text node carries translatable content (non-blank, has letters/CJK). */
export function isTranslatableText(node: Text): boolean {
  const text = (node.nodeValue ?? '').trim();
  return text.length > 0 && /[a-zA-Z\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(text);
}

/** Extract all translatable Text nodes under root, without modifying the DOM. */
export function extractTextNodes(root: Element | Document): Text[] {
  const result: Text[] = [];
  collectTranslatableNodes(root, result);
  return result;
}

function collectTranslatableNodes(node: Node, out: Text[]): void {
  if (node.nodeType === Node.TEXT_NODE) {
    if (isTranslatableText(node as Text)) out.push(node as Text);
    return;
  }
  if (node.nodeType === Node.ELEMENT_NODE && isSkippedElement(node as Element)) return;
  node.childNodes.forEach((child) => collectTranslatableNodes(child, out));
}
