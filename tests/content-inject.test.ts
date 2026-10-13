// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { INJECTED_CLASS, extractTextNodes } from '../src/content/dom-parser';
import { injectTranslations, removeAllTranslations } from '../src/content/inject';

function parse(html: string): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = html;
  return container;
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('injectTranslations', () => {
  it('inserts a twin-read-trans span right after each original text node (ADR-002)', () => {
    const container = parse('<p>Hello <em>world</em></p>');
    const nodes = extractTextNodes(container);

    expect(injectTranslations(nodes, ['你好', '世界'])).toBe(2);

    const spans = container.querySelectorAll(`span.${INJECTED_CLASS}`);
    expect(spans).toHaveLength(2);
    expect(spans[0]?.previousSibling).toBe(nodes[0]); // inserted immediately after
    expect(spans[0]?.textContent).toBe('你好');
    expect(spans[1]?.previousSibling).toBe(nodes[1]);
    expect(spans[1]?.textContent).toBe('世界');
  });

  it('never modifies the original text nodes', () => {
    const container = parse('<p>Keep me</p>');
    const node = extractTextNodes(container)[0]!;

    injectTranslations([node], ['保留']);

    expect(node.nodeValue).toBe('Keep me');
    expect(container.textContent).toContain('Keep me');
    expect(container.textContent).toContain('保留');
  });

  it('skips empty translations and detached nodes', () => {
    const container = parse('<p>One</p>');
    const attached = extractTextNodes(container)[0]!;
    const detached = document.createTextNode('orphan');

    expect(injectTranslations([attached, detached], ['', '孤立'])).toBe(0);
    expect(container.querySelector(`span.${INJECTED_CLASS}`)).toBeNull();
  });

  it('trims translated texts', () => {
    const container = parse('<p>Word</p>');
    const node = extractTextNodes(container)[0]!;

    injectTranslations([node], ['  单词  ']);

    expect(container.querySelector(`span.${INJECTED_CLASS}`)?.textContent).toBe('单词');
  });

  it('applies the injected class so re-extraction never includes injected text', () => {
    const container = parse('<p>Once</p>');
    const node = extractTextNodes(container)[0]!;

    injectTranslations([node], ['一次']);

    const reextracted = extractTextNodes(container).map((n) => (n.nodeValue ?? '').trim());
    expect(reextracted).toEqual(['Once']); // the injected 一次 is skipped
  });
});

describe('removeAllTranslations', () => {
  it('removes every injected span and restores the page', () => {
    document.body.innerHTML = '<p>Alpha</p><p>Beta</p>';
    const nodes = extractTextNodes(document.body);
    injectTranslations(nodes, ['甲', '乙']);

    expect(document.querySelectorAll(`span.${INJECTED_CLASS}`)).toHaveLength(2);

    expect(removeAllTranslations(document)).toBe(2);

    expect(document.querySelectorAll(`span.${INJECTED_CLASS}`)).toHaveLength(0);
    expect(document.body.textContent).toBe('AlphaBeta');
  });

  it('returns 0 when nothing was injected', () => {
    document.body.innerHTML = '<p>A</p>';
    expect(removeAllTranslations(document)).toBe(0);
  });
});
