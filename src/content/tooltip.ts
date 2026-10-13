/**
 * Selection tooltip rendered inside a closed ShadowRoot (ADR-003).
 *
 * The host <div> carries only inline styles (position/z-index), so host-page
 * CSS cannot break the tooltip; everything else lives inside the shadow tree.
 */

const HOST_ID = 'twin-read-tooltip-host';

const PANEL_STYLES = `
  .panel {
    font: 13px/1.6 system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
    color: #1f2328;
    background: #ffffff;
    border: 1px solid #d0d7de;
    border-radius: 8px;
    padding: 10px 12px;
    box-sizing: border-box;
    max-width: 360px;
    max-height: 240px;
    overflow: auto;
    box-shadow: 0 4px 16px rgba(140, 149, 159, 0.3);
    white-space: pre-wrap;
    word-break: break-word;
  }
  .panel.loading { color: #9a6700; }
  .panel.error { color: #cf222e; }
  @media (prefers-color-scheme: dark) {
    .panel {
      color: #e6edf3;
      background: #1c2128;
      border-color: #3d444d;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
    }
    .panel.loading { color: #d29922; }
    .panel.error { color: #f85149; }
  }
`;

let hostElement: HTMLDivElement | null = null;
let shadowRoot: ShadowRoot | null = null;
let panel: HTMLDivElement | null = null;

/** The host element (used by event handlers to detect clicks inside the tooltip). */
export function getTooltipHost(): HTMLElement | null {
  return hostElement;
}

/** Internal accessor for unit tests (closed shadow roots are invisible otherwise). */
export function getTooltipShadowRoot(): ShadowRoot | null {
  return shadowRoot;
}

function ensureTooltip(): void {
  if (hostElement !== null && shadowRoot !== null && panel !== null) return;
  hostElement = document.createElement('div');
  hostElement.id = HOST_ID;
  hostElement.style.position = 'fixed';
  hostElement.style.left = '0px';
  hostElement.style.top = '0px';
  hostElement.style.zIndex = '2147483647';
  shadowRoot = hostElement.attachShadow({ mode: 'closed' });
  shadowRoot.innerHTML = `<style>${PANEL_STYLES}</style><div class="panel"></div>`;
  panel = shadowRoot.querySelector('div.panel');
  if (panel === null) {
    throw new Error('tooltip shadow DOM 初始化失败：缺少 panel 节点');
  }
  document.documentElement.appendChild(hostElement);
}

function renderTooltip(rect: DOMRect, text: string, kind: 'loading' | 'error' | ''): void {
  ensureTooltip();
  if (hostElement === null || panel === null) return;
  panel.className = kind ? `panel ${kind}` : 'panel';
  panel.textContent = text;
  hostElement.style.display = '';
  positionTooltip(rect);
}

function positionTooltip(rect: DOMRect): void {
  const host = hostElement;
  if (host === null) return;
  const margin = 8;
  const gap = 6;
  const maxWidth = Math.max(window.innerWidth - host.offsetWidth - margin, margin);
  const left = Math.min(Math.max(rect.left, margin), maxWidth);
  let top = rect.bottom + gap;
  const belowFits = top + host.offsetHeight + margin <= window.innerHeight;
  const aboveFits = rect.top - host.offsetHeight - margin >= 0;
  if (!belowFits && aboveFits) {
    top = rect.top - host.offsetHeight - gap;
  }
  host.style.left = `${Math.round(left)}px`;
  host.style.top = `${Math.round(top)}px`;
}

export function showTooltipLoading(rect: DOMRect): void {
  renderTooltip(rect, '正在结合上下文翻译…', 'loading');
}

export function showTooltipText(rect: DOMRect, text: string): void {
  renderTooltip(rect, text, '');
}

export function showTooltipError(rect: DOMRect, message: string): void {
  renderTooltip(rect, `翻译失败：${message}`, 'error');
}

export function hideTooltip(): void {
  if (hostElement !== null) hostElement.style.display = 'none';
}
