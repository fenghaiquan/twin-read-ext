// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  extractTextNodes,
  isSkippedElement,
  isTranslatableText,
  INJECTED_CLASS,
} from '../src/content/dom-parser';

function parse(html: string): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = html;
  return container;
}

function textsOf(html: string): string[] {
  return extractTextNodes(parse(html)).map((node) => (node.nodeValue ?? '').trim());
}

function textNode(text: string): Text {
  return document.createTextNode(text);
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('isTranslatableText', () => {
  it('rejects blank text', () => {
    expect(isTranslatableText(textNode('   \n\t '))).toBe(false);
  });

  it('rejects digit/symbol-only text', () => {
    expect(isTranslatableText(textNode('123'))).toBe(false);
    expect(isTranslatableText(textNode('!!! ??? ---'))).toBe(false);
    expect(isTranslatableText(textNode('3.14 / 2.0'))).toBe(false);
  });

  it('accepts letters and CJK text', () => {
    expect(isTranslatableText(textNode('Hello'))).toBe(true);
    expect(isTranslatableText(textNode('这是中文内容'))).toBe(true);
  });
});

describe('isSkippedElement', () => {
  it('marks non-content tags as skipped', () => {
    for (const tag of ['script', 'style', 'code', 'pre', 'noscript', 'textarea', 'template', 'svg']) {
      const element = document.createElement(tag);
      expect(isSkippedElement(element)).toBe(true);
    }
  });

  it('keeps normal content tags', () => {
    expect(isSkippedElement(document.createElement('p'))).toBe(false);
    expect(isSkippedElement(document.createElement('div'))).toBe(false);
    expect(isSkippedElement(document.createElement('span'))).toBe(false);
  });

  it('marks elements carrying the injected-translation class', () => {
    const element = document.createElement('span');
    element.className = INJECTED_CLASS;
    expect(isSkippedElement(element)).toBe(true);
  });

  it('marks hidden elements', () => {
    const hiddenAttr = document.createElement('p');
    hiddenAttr.hidden = true;
    expect(isSkippedElement(hiddenAttr)).toBe(true);

    const displayNone = document.createElement('div');
    displayNone.style.display = 'none';
    expect(isSkippedElement(displayNone)).toBe(true);

    const visibilityHidden = document.createElement('div');
    visibilityHidden.style.visibility = 'hidden';
    expect(isSkippedElement(visibilityHidden)).toBe(true);
  });
});

describe('extractTextNodes', () => {
  it('extracts plain paragraph text', () => {
    expect(textsOf('<p>Hello world</p><p>Second paragraph</p>')).toEqual([
      'Hello world',
      'Second paragraph',
    ]);
  });

  it('extracts each text node inside nested inline elements (ADR-002 unit)', () => {
    expect(textsOf('<p>The <em>quick</em> brown <strong>fox</strong></p>')).toEqual([
      'The',
      'quick',
      'brown',
      'fox',
    ]);
  });

  it('skips script/style/code/pre/noscript/textarea/template/svg subtrees', () => {
    const html = [
      '<script>var x = "code here";</script>',
      '<style>.a { color: red; }</style>',
      '<code>const a = 1;</code>',
      '<pre>preformatted text</pre>',
      '<noscript>enable js</noscript>',
      '<textarea>some input</textarea>',
      '<template><p>template text</p></template>',
      '<svg><text>SVG label</text></svg>',
      '<p>Visible text</p>',
    ].join('');
    expect(textsOf(html)).toEqual(['Visible text']);
  });

  it('skips blank and digit/symbol-only text nodes', () => {
    expect(textsOf('<p>   </p><p>123</p><p>!!!</p><p>Real content</p>')).toEqual([
      'Real content',
    ]);
  });

  it('skips hidden elements and their subtrees', () => {
    const html =
      '<p hidden>hidden text</p><div style="display: none"><p>also hidden</p></div><p>shown</p>';
    expect(textsOf(html)).toEqual(['shown']);
  });

  it('skips previously injected translation nodes (no re-translation)', () => {
    const html = `<p>Original</p><p><span class="${INJECTED_CLASS}">已有的翻译</span> tail</p>`;
    expect(textsOf(html)).toEqual(['Original', 'tail']);
  });

  it('keeps CJK content', () => {
    expect(textsOf('<p>这是中文内容</p>')).toEqual(['这是中文内容']);
  });

  it('extracts from a whole Document', () => {
    document.body.innerHTML = '<p>body text</p><script>nope()</script>';
    const nodes = extractTextNodes(document);
    expect(nodes.map((node) => node.nodeValue?.trim())).toEqual(['body text']);
  });

  it('does not modify the DOM it traverses', () => {
    const container = parse('<p>Hello <em>world</em></p>');
    const before = container.innerHTML;
    extractTextNodes(container);
    expect(container.innerHTML).toBe(before);
  });
});
