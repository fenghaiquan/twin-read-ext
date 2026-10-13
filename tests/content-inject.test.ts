// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { INJECTED_CLASS, extractBlockTargets } from '../src/content/dom-parser';
import {
  injectTranslations,
  removeAllTranslations,
  insertPendingAfter,
  finalizePending,
  markFailed,
} from '../src/content/inject';

function parse(html: string): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = html;
  return container;
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('injectTranslations', () => {
  it('inserts a twin-read-trans span right after each block element (ADR-004)', () => {
    const container = parse('<p>Hello world</p><p>Second paragraph</p>');
    const blocks = extractBlockTargets(container);

    expect(injectTranslations(blocks.map(b => b.element), ['你好世界', '第二段'])).toBe(2);

    const spans = container.querySelectorAll(`span.${INJECTED_CLASS}`);
    expect(spans).toHaveLength(2);
    expect(spans[0]?.previousSibling).toBe(blocks[0]!.element); // inserted immediately after
    expect(spans[0]?.textContent).toBe('你好世界');
    expect(spans[1]?.previousSibling).toBe(blocks[1]!.element);
    expect(spans[1]?.textContent).toBe('第二段');
  });

  it('never modifies the original elements', () => {
    const container = parse('<p>Keep me</p>');
    const block = extractBlockTargets(container)[0]!;

    injectTranslations([block.element], ['保留我']);

    expect(block.element.textContent).toBe('Keep me');
    expect(container.textContent).toContain('Keep me');
    expect(container.textContent).toContain('保留我');
  });

  it('skips empty translations and detached nodes', () => {
    const container = parse('<p>One</p>');
    const attached = extractBlockTargets(container)[0]!.element;
    const detached = document.createElement('p');
    detached.textContent = 'orphan';

    expect(injectTranslations([attached, detached], ['', '孤立'])).toBe(0);
    expect(container.querySelector(`span.${INJECTED_CLASS}`)).toBeNull();
  });

  it('trims translated texts', () => {
    const container = parse('<p>Word</p>');
    const block = extractBlockTargets(container)[0]!.element;

    injectTranslations([block], ['  单词  ']);

    expect(container.querySelector(`span.${INJECTED_CLASS}`)?.textContent).toBe('单词');
  });

  it('applies the injected class so re-extraction never includes injected text', () => {
    const container = parse('<p>Once</p>');
    const block = extractBlockTargets(container)[0]!;

    injectTranslations([block.element], ['一次']);

    const reextracted = extractBlockTargets(container).map(b => b.text);
    expect(reextracted).toEqual(['Once']); // the injected 一次 is skipped
  });
});

describe('removeAllTranslations', () => {
  it('removes every injected span and restores the page', () => {
    document.body.innerHTML = '<p>Alpha</p><p>Beta</p>';
    const blocks = extractBlockTargets(document.body);
    injectTranslations(blocks.map(b => b.element), ['甲', '乙']);

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

describe('pending markers (Sprint 4.1)', () => {
  it('inserts a pending marker with placeholder text', () => {
    const container = parse('<p>Loading test</p>');
    const block = extractBlockTargets(container)[0]!.element;

    const pending = insertPendingAfter(block);

    expect(pending.textContent).toBe('… 翻译中');
    expect(pending.classList.contains('twin-read-pending')).toBe(true);
    expect(pending.style.opacity).toBe('0.6');
    expect(pending.previousSibling).toBe(block);
  });

  it('finalizes pending marker with actual translation', () => {
    const container = parse('<p>Finalize test</p>');
    const block = extractBlockTargets(container)[0]!.element;

    const pending = insertPendingAfter(block);
    finalizePending(pending, '最终翻译');

    expect(pending.textContent).toBe('最终翻译');
    expect(pending.classList.contains('twin-read-pending')).toBe(false);
    expect(pending.style.opacity).toBe('1');
    expect(pending.style.fontStyle).toBe('normal');
  });

  it('marks pending as failed', () => {
    const container = parse('<p>Fail test</p>');
    const block = extractBlockTargets(container)[0]!.element;

    const pending = insertPendingAfter(block);
    markFailed(pending);

    expect(pending.textContent).toBe('⚠ 翻译失败');
    expect(pending.classList.contains('twin-read-pending')).toBe(false);
    expect(pending.classList.contains('twin-read-failed')).toBe(true);
    expect(pending.style.color).toBe('#991b1b');
  });
});
