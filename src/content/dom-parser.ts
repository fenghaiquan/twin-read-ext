/**
 * Pure DOM traversal for full-page translation (Sprint 3 + 4.1, TDD).
 *
 * Extracts translatable content WITHOUT modifying the DOM (ADR-002).
 * Skip rules:
 * - non-content tags (script/style/code/pre/...)
 * - elements hidden via the hidden attribute or inline display/visibility
 * - nodes injected by us in a previous translation pass (INJECTED_CLASS)
 * - blank / digit-or-symbol-only text
 *
 * Sprint 4.1 upgrade: block-level extraction for lazy translation (ADR-004)
 */

/** Class applied to injected translation nodes (must match ADR-002). */
export const INJECTED_CLASS = 'twin-read-trans';

export const SKIP_TAGS: ReadonlySet<string> = new Set([
  'script', 'style', 'code', 'pre', 'kbd', 'samp', 'noscript',
  'textarea', 'template', 'svg', 'math', 'iframe',
]);

/** Block-level elements that serve as translation anchors (ADR-004). */
export const BLOCK_TAGS: ReadonlySet<string> = new Set([
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'li', 'blockquote', 'td', 'th', 'dd', 'dt',
  'figcaption', 'summary',
]);

/** A block-level element with its merged translatable text. */
export interface BlockTarget {
  element: Element;
  text: string;
}

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

/**
 * Extract leaf block-level elements with their merged translatable text (ADR-004).
 *
 * A "leaf block" is a block-tagged element that does NOT contain nested block-tagged
 * descendants. This ensures we translate at the paragraph/list-item level, not at
 * arbitrary div wrappers.
 *
 * Skips blocks that:
 * - Are in SKIP_TAGS subtree (code/pre etc.)
 * - Are hidden
 * - Already contain INJECTED_CLASS spans (re-translation guard)
 * - Have no translatable text
 */
export function extractBlockTargets(root: Element | Document): BlockTarget[] {
  const result: BlockTarget[] = [];
  collectBlockTargets(root, result);
  return result;
}

function collectBlockTargets(node: Node, out: BlockTarget[]): void {
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const element = node as Element;

  if (isSkippedElement(element)) return;

  const tag = element.tagName.toLowerCase();

  // If this is a block element, check if it's a leaf (no nested block descendants)
  if (BLOCK_TAGS.has(tag)) {
    if (!hasNestedBlockDescendants(element) && !element.querySelector(`.${INJECTED_CLASS}`)) {
      const text = collectBlockText(element);
      if (text.length > 0) {
        out.push({ element, text });
        return; // Don't recurse into children
      }
    }
  }

  // Recurse into children
  element.childNodes.forEach((child) => collectBlockTargets(child, out));
}

/** True if the element contains a descendant with a BLOCK_TAG. */
function hasNestedBlockDescendants(element: Element): boolean {
  for (const child of element.children) {
    if (BLOCK_TAGS.has(child.tagName.toLowerCase())) return true;
    if (hasNestedBlockDescendants(child)) return true;
  }
  return false;
}

/** Collect and merge all translatable text within a block element. */
function collectBlockText(element: Element): string {
  const nodes = extractTextNodes(element);
  return nodes.map((node) => (node.nodeValue ?? '').trim()).join(' ').replace(/\s+/g, ' ').trim();
}
