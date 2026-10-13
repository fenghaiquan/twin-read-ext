// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  extractBlockTargets,
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

describe('extractBlockTargets', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('extracts leaf paragraphs', () => {
    document.body.innerHTML = '<p>Hello world</p><p>Second paragraph</p>';
    const blocks = extractBlockTargets(document.body);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]!.text).toBe('Hello world');
    expect(blocks[1]!.text).toBe('Second paragraph');
  });

  it('merges inline text nodes into single block text', () => {
    document.body.innerHTML = '<p>The <em>quick</em> brown <strong>fox</strong></p>';
    const blocks = extractBlockTargets(document.body);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.text).toBe('The quick brown fox');
  });

  it('skips non-leaf blocks (contains nested block elements)', () => {
    document.body.innerHTML = '<div><p>Nested paragraph</p></div>';
    const blocks = extractBlockTargets(document.body);
    // div is not a block tag, but p is - should extract p, not div
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.element.tagName).toBe('P');
    expect(blocks[0]!.text).toBe('Nested paragraph');
  });

  it('skips blocks inside script/style/code/pre/noscript/textarea', () => {
    document.body.innerHTML = `
      <script>var x = "code here";</script>
      <style>.a { color: red; }</style>
      <code><p>const a = 1;</p></code>
      <pre><p>preformatted text</p></pre>
      <noscript><p>enable js</p></noscript>
      <textarea><p>some input</p></textarea>
      <p>Visible text</p>
    `;
    const blocks = extractBlockTargets(document.body);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.text).toBe('Visible text');
  });

  it('skips blank blocks', () => {
    document.body.innerHTML = '<p>   </p><p>123</p><p>!!!</p><p>Real content</p>';
    const blocks = extractBlockTargets(document.body);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.text).toBe('Real content');
  });

  it('skips hidden blocks', () => {
    document.body.innerHTML = '<p hidden>hidden text</p><p>shown</p>';
    const blocks = extractBlockTargets(document.body);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.text).toBe('shown');
  });

  it('skips blocks with display:none', () => {
    document.body.innerHTML = '<div style="display: none"><p>also hidden</p></div><p>shown</p>';
    const blocks = extractBlockTargets(document.body);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.text).toBe('shown');
  });

  it('skips blocks containing injected translations', () => {
    document.body.innerHTML = `
      <p>Original</p>
      <p><span class="${INJECTED_CLASS}">已有的翻译</span> tail</p>
    `;
    const blocks = extractBlockTargets(document.body);
    // First p should be extracted, second p contains injected class so skipped
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.text).toBe('Original');
  });

  it('extracts list items', () => {
    document.body.innerHTML = '<ul><li>First item</li><li>Second item</li></ul>';
    const blocks = extractBlockTargets(document.body);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]!.text).toBe('First item');
    expect(blocks[1]!.text).toBe('Second item');
  });

  it('extracts headings', () => {
    document.body.innerHTML = '<h1>Title</h1><h2>Subtitle</h2><p>Paragraph</p>';
    const blocks = extractBlockTargets(document.body);
    expect(blocks).toHaveLength(3);
    expect(blocks[0]!.element.tagName).toBe('H1');
    expect(blocks[1]!.element.tagName).toBe('H2');
    expect(blocks[2]!.element.tagName).toBe('P');
  });

  it('extracts blockquotes', () => {
    document.body.innerHTML = '<blockquote>A quote</blockquote>';
    const blocks = extractBlockTargets(document.body);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.text).toBe('A quote');
  });

  it('extracts table cells', () => {
    document.body.innerHTML = '<table><tr><td>Cell 1</td><td>Cell 2</td></tr></table>';
    const blocks = extractBlockTargets(document.body);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]!.text).toBe('Cell 1');
    expect(blocks[1]!.text).toBe('Cell 2');
  });

  it('does not modify the DOM it traverses', () => {
    document.body.innerHTML = '<p>Hello <em>world</em></p>';
    const before = document.body.innerHTML;
    extractBlockTargets(document.body);
    expect(document.body.innerHTML).toBe(before);
  });
});
