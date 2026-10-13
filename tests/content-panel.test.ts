// @vitest-environment happy-dom
import { describe, expect, it, beforeEach } from 'vitest';
import {
  getPanelHost,
  getPanelElement,
  getDotElement,
  getShadowRoot,
  showDot,
  hideDot,
  openPanel,
  showWordResult,
  showTranslationResult,
  showError,
  hide,
  isPanelPinned,
} from '../src/content/panel';

function makeRect(left = 100, top = 100, width = 150, height = 20): DOMRect {
  return { left, top, right: left + width, bottom: top + height, width, height } as DOMRect;
}

beforeEach(() => {
  document.body.innerHTML = '';
  hide();
});

describe('panel (ADR-003 Shadow DOM isolation)', () => {
  it('mounts a single host element on <html> with a closed shadow root', () => {
    showDot(makeRect());
    const host = getPanelHost();
    expect(host).not.toBeNull();
    expect(document.getElementById('twin-read-panel-host')).toBe(host);
    expect(document.documentElement.contains(host)).toBe(true);
    // closed mode: outside code (including the host page) cannot reach the shadow tree
    expect((host as HTMLDivElement).shadowRoot).toBeNull();
  });

  it('shows a dot indicator at the selection position', () => {
    showDot(makeRect(100, 100, 150, 20));
    const dot = getDotElement();
    expect(dot).not.toBeNull();
    expect(dot?.classList.contains('visible')).toBe(true);
  });

  it('hides the dot when requested', () => {
    showDot(makeRect());
    hideDot();
    const dot = getDotElement();
    expect(dot?.classList.contains('visible')).toBe(false);
  });

  it('opens a panel with loading state', () => {
    showDot(makeRect());
    openPanel(makeRect());
    const host = getPanelHost();
    const shadow = getShadowRoot();
    expect(host).not.toBeNull();
    expect(shadow).not.toBeNull();
    // Panel should be visible
    const panel = shadow?.querySelector('.panel');
    expect(panel?.classList.contains('visible')).toBe(true);
    // Should show loading text
    expect(panel?.textContent).toContain('正在结合上下文翻译');
  });

  it('shows word result with title and context', () => {
    showDot(makeRect());
    showWordResult(makeRect(), 'deliberately', 'adv. 故意地；蓄意地\n在提供的语境中，该词表示行为是经过深思熟虑或有意为之的。');
    const shadow = getShadowRoot();
    const title = shadow?.querySelector('.word-title');
    expect(title?.textContent).toBe('deliberately');
    const context = shadow?.querySelector('.word-context');
    expect(context?.textContent).toContain('故意地');
  });

  it('shows translation result with original and translation blocks', () => {
    showDot(makeRect());
    showTranslationResult(
      makeRect(),
      'In another instance, the data Claude Mythos 5 needed was free',
      '在另一个案例中，Claude Mythos 5 所需的数据是免费的',
    );
    const shadow = getShadowRoot();
    const original = shadow?.querySelector('.original-block');
    expect(original?.textContent).toContain('Claude Mythos 5');
    const translation = shadow?.querySelector('.translation-text');
    expect(translation?.textContent).toContain('免费的');
  });

  it('shows error message in red', () => {
    showDot(makeRect());
    showError(makeRect(), '尚未配置 API Key');
    const shadow = getShadowRoot();
    const error = shadow?.querySelector('.error');
    expect(error?.textContent).toContain('尚未配置 API Key');
  });

  it('hides both dot and panel', () => {
    showDot(makeRect());
    openPanel(makeRect());
    hide();
    const dot = getDotElement();
    const shadow = getShadowRoot();
    const panel = shadow?.querySelector('.panel');
    expect(dot?.classList.contains('visible')).toBe(false);
    expect(panel?.classList.contains('visible')).toBe(false);
  });

  it('positions the dot inline right after the last word, vertically centered', () => {
    // anchor rect of the last line fragment: top=100, height=20, right=250
    showDot(makeRect(100, 100, 150, 20));
    const dot = getDotElement();
    const left = Number.parseInt(dot?.style.left ?? '0', 10);
    const top = Number.parseInt(dot?.style.top ?? '0', 10);
    expect(left).toBe(254); // rect.right (250) + DOT_OFFSET (4)
    expect(top).toBe(104); // rect.top + (height - DOT_SIZE) / 2 = 100 + 4
  });

  it('positions panel below the selection rect', () => {
    showDot(makeRect());
    openPanel(makeRect());
    const panel = getPanelElement();
    const panelTop = Number.parseInt(panel?.style.top ?? '0', 10);
    const rect = makeRect();
    // Panel should be below the selection
    expect(panelTop).toBeGreaterThan(rect.bottom);
  });
});

describe('panel pin (图钉)：固定后可拖动', () => {
  function getPinButton(): HTMLButtonElement {
    const pin = getShadowRoot()?.querySelector('.panel-pin');
    if (!(pin instanceof HTMLButtonElement)) throw new Error('pin button not found');
    return pin;
  }

  it('toggles the pin state from the header pin button and resets on hide()', () => {
    showDot(makeRect());
    openPanel(makeRect());
    expect(isPanelPinned()).toBe(false);

    getPinButton().click();
    expect(isPanelPinned()).toBe(true);
    expect(getPanelElement()?.classList.contains('pinned')).toBe(true);

    getPinButton().click();
    expect(isPanelPinned()).toBe(false);

    getPinButton().click();
    hide();
    expect(isPanelPinned()).toBe(false); // closing the panel always releases the pin
  });

  it('keeps the panel position when pinned and a new translation arrives', () => {
    showDot(makeRect());
    openPanel(makeRect());
    const panel = getPanelElement();
    const before = { left: panel?.style.left ?? '', top: panel?.style.top ?? '' };

    getPinButton().click();
    showTranslationResult(makeRect(600, 500), 'Hello world', '你好，世界');

    // content updates but the user-pinned position is preserved
    expect(panel?.style.left).toBe(before.left);
    expect(panel?.style.top).toBe(before.top);
    const shadow = getShadowRoot();
    expect(shadow?.querySelector('.translation-text')?.textContent).toContain('你好');
  });

  it('moves the pinned panel by dragging its header and clamps to the viewport', () => {
    showDot(makeRect());
    openPanel(makeRect());
    getPinButton().click();
    const panel = getPanelElement();
    const beforeLeft = Number.parseInt(panel?.style.left ?? '0', 10);

    const header = getShadowRoot()?.querySelector('.panel-header');
    if (!(header instanceof HTMLElement)) throw new Error('panel header not found');
    header.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 150, clientY: 130 }));
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 400, clientY: 300 }));
    document.dispatchEvent(new MouseEvent('mouseup'));

    const afterLeft = Number.parseInt(panel?.style.left ?? '0', 10);
    expect(afterLeft).toBeGreaterThan(beforeLeft);
    // clamped: top stays within the viewport height
    const afterTop = Number.parseInt(panel?.style.top ?? '0', 10);
    expect(afterTop).toBeLessThanOrEqual(window.innerHeight);
  });

  it('does not drag when the panel is not pinned', () => {
    showDot(makeRect());
    openPanel(makeRect());
    const panel = getPanelElement();
    const before = { left: panel?.style.left ?? '', top: panel?.style.top ?? '' };

    const header = getShadowRoot()?.querySelector('.panel-header');
    if (!(header instanceof HTMLElement)) throw new Error('panel header not found');
    header.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 150, clientY: 130 }));
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 400, clientY: 300 }));
    document.dispatchEvent(new MouseEvent('mouseup'));

    expect(panel?.style.left).toBe(before.left);
    expect(panel?.style.top).toBe(before.top);
  });
});
