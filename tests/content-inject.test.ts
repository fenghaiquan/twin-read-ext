// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { INJECTED_CLASS, extractBlockTargets } from '../src/content/dom-parser';
import {
  appendPendingSpinner,
  insertTranslationAfter,
  markSpinnerFailed,
  removeAllTranslations,
} from '../src/content/inject';

function parse(html: string): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = html;
  return container;
}

function firstAnchor(html: string): { container: HTMLElement; anchor: Element } {
  const container = parse(html);
  const block = extractBlockTargets(container)[0]!;
  return { container, anchor: block.element };
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('insertTranslationAfter', () => {
  it('inserts a twin-read-trans span right after the anchor block (ADR-002)', () => {
    const container = parse('<p>Hello world</p><p>Second</p>');
    const [first, second] = extractBlockTargets(container);

    insertTranslationAfter(first!.element, '你好世界');
    insertTranslationAfter(second!.element, '第二段');

    const spans = container.querySelectorAll(`span.${INJECTED_CLASS}`);
    expect(spans).toHaveLength(2);
    expect(spans[0]?.previousSibling).toBe(first!.element);
    expect(spans[0]?.textContent).toBe('你好世界');
    expect(spans[1]?.previousSibling).toBe(second!.element);
    expect(spans[1]?.textContent).toBe('第二段');
  });

  it('never modifies the original element content', () => {
    const { anchor } = firstAnchor('<p>Keep me</p>');
    insertTranslationAfter(anchor, '保留我');
    expect(anchor.textContent).toBe('Keep me');
  });

  it('skips empty or whitespace-only translations', () => {
    const { container, anchor } = firstAnchor('<p>One</p>');
    insertTranslationAfter(anchor, '   ');
    expect(container.querySelector(`span.${INJECTED_CLASS}`)).toBeNull();
  });

  it('skips detached anchors', () => {
    const detached = document.createElement('p');
    detached.textContent = 'orphan';
    insertTranslationAfter(detached, '孤立');
    expect(detached.parentNode).toBeNull();
  });

  it('displays as a block below the original with subtle color', () => {
    const { container, anchor } = firstAnchor('<p>Word</p>');
    insertTranslationAfter(anchor, '单词');
    const span = container.querySelector(`span.${INJECTED_CLASS}`) as HTMLSpanElement;
    expect(span.style.display).toBe('block');
    expect(span.style.marginTop).toBe('0.25em');
    expect(span.style.color).toBe('#64748b');
    expect(span.style.fontStyle).not.toBe('italic'); // inherits, not forced
  });

  it('copies the anchor typography/width so the translation matches the original', () => {
    const container = parse('<p style="width: 300px; font-weight: bold">Sized text</p>');
    document.body.appendChild(container); // getComputedStyle needs a mounted element
    const anchor = extractBlockTargets(container)[0]!.element;

    insertTranslationAfter(anchor, '定宽加粗文本');

    const span = container.querySelector(`span.${INJECTED_CLASS}`) as HTMLSpanElement;
    expect(span.style.width).toBe('300px'); // layout width aligned with the original
    expect(span.style.fontWeight).toBe('bold'); // same typography as the original
  });

  it('copies margin for centered/indented anchors so translation aligns horizontally', () => {
    const container = parse('<p style="margin: 0 auto; width: 600px">Centered text</p>');
    document.body.appendChild(container);
    const anchor = extractBlockTargets(container)[0]!.element;

    insertTranslationAfter(anchor, '居中译文');

    const span = container.querySelector(`span.${INJECTED_CLASS}`) as HTMLSpanElement;
    expect(span.style.marginLeft).toBe('auto');
    expect(span.style.marginRight).toBe('auto');
    expect(span.style.width).toBe('600px');
  });

  it('appends inside table cells instead of breaking the row layout', () => {
    const container = parse('<table><tr><td>Cell</td></tr></table>');
    const anchor = extractBlockTargets(container)[0]!.element;

    insertTranslationAfter(anchor, '单元格');

    expect(anchor.lastElementChild?.textContent).toBe('单元格');
    const row = container.querySelector('tr')!;
    expect([...row.children].map((el) => el.tagName)).toEqual(['TD']); // no stray span in <tr>
  });

  it('applies the injected class so re-extraction never includes injected text', () => {
    const container = parse('<p>Once</p>');
    const anchor = extractBlockTargets(container)[0]!.element;

    insertTranslationAfter(anchor, '一次');

    expect(extractBlockTargets(container).map((b) => b.text)).toEqual(['Once']);
  });
});

describe('appendPendingSpinner', () => {
  it('appends a small spinning circle at the very end of the paragraph', () => {
    const { container, anchor } = firstAnchor('<p>Translating</p>');

    const spinner = appendPendingSpinner(anchor);

    expect(anchor.lastElementChild).toBe(spinner);
    expect(spinner.classList.contains(INJECTED_CLASS)).toBe(true);
    expect(spinner.style.display).toBe('inline-block');
    expect(spinner.style.borderRadius).toBe('50%');
    expect(spinner.style.animation).toContain('twin-read-spin');
    expect(container.textContent).toBe('Translating'); // pure circle, no placeholder text
  });

  it('injects the keyframes stylesheet only once', () => {
    const { anchor } = firstAnchor('<p>A</p>');
    appendPendingSpinner(anchor);
    appendPendingSpinner(anchor);
    expect(document.querySelectorAll('style#twin-read-style')).toHaveLength(1);
  });
});

describe('markSpinnerFailed', () => {
  it('replaces the spinner with a small failure glyph', () => {
    const { anchor } = firstAnchor('<p>Fail</p>');
    const spinner = appendPendingSpinner(anchor);

    markSpinnerFailed(spinner);

    expect(spinner.textContent).toBe('⚠');
    expect(spinner.className).toContain('twin-read-failed');
    expect(spinner.style.animation).not.toContain('twin-read-spin');
  });
});

describe('removeAllTranslations', () => {
  it('removes translation spans and pending spinners, restoring the page', () => {
    document.body.innerHTML = '<p>Alpha</p><p>Beta</p>';
    const [alpha, beta] = extractBlockTargets(document.body);

    insertTranslationAfter(alpha!.element, '甲');
    appendPendingSpinner(beta!.element);

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
