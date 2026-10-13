// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import {
  getTooltipHost,
  getTooltipShadowRoot,
  hideTooltip,
  showTooltipError,
  showTooltipLoading,
  showTooltipText,
} from '../src/content/tooltip';

const HOST_ID = 'twin-read-tooltip-host';

function rect(left = 10, top = 10, width = 200, height = 20): DOMRect {
  return { left, top, right: left + width, bottom: top + height, width, height } as DOMRect;
}

function readPanel(): HTMLDivElement {
  const root = getTooltipShadowRoot();
  if (root === null) throw new Error('shadow root not created');
  const panel = root.firstElementChild?.nextElementSibling;
  if (!(panel instanceof HTMLDivElement)) throw new Error('panel not found');
  return panel;
}

describe('tooltip (ADR-003 Shadow DOM isolation)', () => {
  it('mounts a single host element on <html> with a closed shadow root', () => {
    showTooltipText(rect(), '你好');
    const host = getTooltipHost();
    expect(host).not.toBeNull();
    expect(document.getElementById(HOST_ID)).toBe(host);
    expect(document.documentElement.contains(host)).toBe(true);
    // closed mode: outside code (including the host page) cannot reach the shadow tree
    expect((host as HTMLDivElement).shadowRoot).toBeNull();
    expect(document.querySelectorAll(`#${HOST_ID}`).length).toBe(1);
  });

  it('renders translation text inside the shadow panel', () => {
    showTooltipText(rect(), '苹果公司：指美国科技公司');
    expect(readPanel().textContent).toBe('苹果公司：指美国科技公司');
    expect(readPanel().className).toBe('panel');
    expect(getTooltipHost()?.style.display).toBe('');
  });

  it('styles loading and error states with panel modifiers', () => {
    showTooltipLoading(rect());
    expect(readPanel().className).toContain('loading');
    showTooltipError(rect(), '尚未配置 API Key');
    expect(readPanel().className).toContain('error');
    expect(readPanel().textContent).toContain('尚未配置 API Key');
  });

  it('hides by display:none and comes back on the next show', () => {
    showTooltipText(rect(), 'hi');
    hideTooltip();
    expect(getTooltipHost()?.style.display).toBe('none');
    showTooltipText(rect(), 'again');
    expect(getTooltipHost()?.style.display).toBe('');
    expect(readPanel().textContent).toBe('again');
  });

  it('places the tooltip below the selection rect, clamped inside the viewport', () => {
    showTooltipText(rect(10, 10), 'position check');
    const top = Number.parseInt(getTooltipHost()?.style.top ?? '0', 10);
    const left = Number.parseInt(getTooltipHost()?.style.left ?? '0', 10);
    expect(top).toBeGreaterThan(30); // rect.bottom (30) + gap
    expect(left).toBeGreaterThanOrEqual(0);
  });

  it('moves above the selection when the panel would overflow the viewport bottom', () => {
    const viewportHeight = window.innerHeight;
    const nearBottom = rect(10, viewportHeight - 30);
    showTooltipText(nearBottom, 'flip check');
    const top = Number.parseInt(getTooltipHost()?.style.top ?? '0', 10);
    expect(top).toBeLessThan(viewportHeight - 30);
  });
});
