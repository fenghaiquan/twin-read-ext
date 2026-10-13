/**
 * Selection translation panel with dot indicator (ADR-003 Shadow DOM isolation).
 *
 * Flow:
 * 1. User selects text → showDot() displays pink indicator
 * 2. User clicks dot → dot clicks → panel opens with loading state
 * 3. Translation arrives → showWordResult() or showTranslationResult()
 * 4. User clicks close or outside → hide()
 */

const HOST_ID = 'twin-read-panel-host';
const DOT_SIZE = 12;
const DOT_OFFSET = 4; // gap between the last word and the dot
const PANEL_GAP = 6; // gap between the selection and the panel
const PANEL_MAX_WIDTH = 420;
const PANEL_MAX_HEIGHT = 400;

const STYLES = `
  .dot {
    position: fixed;
    width: ${DOT_SIZE}px;
    height: ${DOT_SIZE}px;
    border-radius: 50%;
    background: #e84393;
    cursor: pointer;
    display: none;
    z-index: 2147483647;
    box-shadow: 0 1px 4px rgba(232, 67, 147, 0.45);
    transition: transform 0.15s ease;
    user-select: none;
    -webkit-user-select: none;
  }
  .dot.visible {
    display: block;
  }
  .dot:hover {
    transform: scale(1.15);
  }

  .panel {
    position: fixed;
    display: none;
    flex-direction: column;
    min-width: 280px;
    max-width: ${PANEL_MAX_WIDTH}px;
    max-height: ${PANEL_MAX_HEIGHT}px;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
    z-index: 2147483646;
    font: 13px/1.55 system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
    color: #1f2328;
    overflow: hidden;
  }
  .panel.visible {
    display: flex;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    border-bottom: 1px solid #f0f0f0;
    font-size: 12px;
    color: #666;
  }
  .panel-title {
    font-weight: 600;
    color: #e84393;
  }
  .panel-close {
    background: none;
    border: none;
    font-size: 18px;
    color: #999;
    cursor: pointer;
    padding: 0 4px;
    line-height: 1;
    border-radius: 4px;
  }
  .panel-close:hover {
    color: #333;
    background: #f5f5f5;
  }

  .panel-body {
    padding: 14px;
    overflow: auto;
    flex: 1;
  }

  .word-title {
    font-size: 20px;
    font-weight: 700;
    color: #1f2328;
    margin: 0 0 8px;
  }
  .word-context {
    font-size: 14px;
    color: #333;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .original-block {
    background: #f7f7f8;
    border-left: 3px solid #e5e7eb;
    border-radius: 0 6px 6px 0;
    padding: 10px 12px;
    margin: 0 0 12px;
    font-size: 13px;
    color: #555;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .translation-text {
    font-size: 15px;
    font-weight: 500;
    color: #1f2328;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .loading {
    color: #9a6700;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
  }
  .loading::before {
    content: '';
    width: 14px;
    height: 14px;
    border: 2px solid #e5c56c;
    border-top-color: #9a6700;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .error {
    color: #cf222e;
    font-size: 14px;
  }

  @media (prefers-color-scheme: dark) {
    .panel {
      background: #1c2128;
      border-color: #3d444d;
      color: #e6edf3;
    }
    .panel-header {
      border-color: #3d444d;
      color: #999;
    }
    .word-title {
      color: #e6edf3;
    }
    .word-context {
      color: #ccc;
    }
    .original-block {
      background: #2d333b;
      border-color: #444c56;
      color: #999;
    }
    .translation-text {
      color: #e6edf3;
    }
    .loading {
      color: #d29922;
    }
    .error {
      color: #f85149;
    }
  }
`;

let hostElement: HTMLDivElement | null = null;
let shadowRoot: ShadowRoot | null = null;
let dot: HTMLDivElement | null = null;
let panel: HTMLDivElement | null = null;
let panelBody: HTMLDivElement | null = null;
let closeBtn: HTMLButtonElement | null = null;

function ensureShadow(): void {
  if (hostElement !== null && shadowRoot !== null) return;

  hostElement = document.createElement('div');
  hostElement.id = HOST_ID;
  shadowRoot = hostElement.attachShadow({ mode: 'closed' });
  shadowRoot.innerHTML = `
    <style>${STYLES}</style>
    <div class="dot"></div>
    <div class="panel">
      <div class="panel-header">
        <span class="panel-title">Twin Read</span>
        <button class="panel-close">×</button>
      </div>
      <div class="panel-body"></div>
    </div>
  `;

  dot = shadowRoot.querySelector('.dot') as HTMLDivElement;
  panel = shadowRoot.querySelector('.panel') as HTMLDivElement;
  panelBody = shadowRoot.querySelector('.panel-body') as HTMLDivElement;
  closeBtn = shadowRoot.querySelector('.panel-close') as HTMLButtonElement;

  dot.addEventListener('click', (e) => {
    e.stopPropagation();
    hostElement?.dispatchEvent(
      new CustomEvent('twin-read-dot-clicked', { bubbles: true, composed: true }),
    );
  });

  closeBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    hide();
  });

  document.documentElement.appendChild(hostElement);
}

function positionElement(
  element: HTMLElement,
  rect: DOMRect,
  placement: 'dot' | 'panel',
): void {
  const margin = 8;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let left: number;
  let top: number;

  if (placement === 'dot') {
    // Inline right after the last word of the selection, vertically
    // centered on the last line (rect is the last line fragment).
    left = rect.right + DOT_OFFSET;
    top = rect.top + (rect.height - DOT_SIZE) / 2;

    // Clamp to viewport
    if (left + DOT_SIZE > viewportWidth - DOT_OFFSET) {
      left = Math.max(rect.left - DOT_SIZE - DOT_OFFSET, DOT_OFFSET);
    }
    top = Math.min(Math.max(top, DOT_OFFSET), viewportHeight - DOT_SIZE - DOT_OFFSET);
  } else {
    // Card below the selection, left-aligned with it (reference layout)
    left = rect.left;
    top = rect.bottom + PANEL_GAP;

    const width = element.offsetWidth || PANEL_MAX_WIDTH;
    const height = element.offsetHeight || 200;

    // Clamp right edge
    if (left + width > viewportWidth - margin) {
      left = Math.max(viewportWidth - width - margin, margin);
    }

    // Flip above the selection if the card would overflow the viewport bottom
    if (top + height > viewportHeight - margin && rect.top - height - margin > 0) {
      top = rect.top - height - margin;
    }
  }

  element.style.left = `${Math.round(left)}px`;
  element.style.top = `${Math.round(top)}px`;
}

export function getPanelHost(): HTMLElement | null {
  return hostElement;
}

export function getDotElement(): HTMLElement | null {
  return dot;
}

export function getShadowRoot(): ShadowRoot | null {
  return shadowRoot;
}

export function getPanelElement(): HTMLDivElement | null {
  return panel;
}

export function showDot(rect: DOMRect): void {
  ensureShadow();
  if (dot === null || hostElement === null) return;
  positionElement(dot, rect, 'dot');
  dot.classList.add('visible');
}

export function hideDot(): void {
  dot?.classList.remove('visible');
}

export function openPanel(rect: DOMRect): void {
  ensureShadow();
  if (panel === null || panelBody === null || hostElement === null) return;

  positionElement(panel, rect, 'panel');
  panelBody.innerHTML = '<div class="loading">正在结合上下文翻译…</div>';
  panel.classList.add('visible');
}

export function showWordResult(rect: DOMRect, word: string, reply: string): void {
  if (panelBody === null) return;
  positionElement(panel!, rect, 'panel');

  panelBody.innerHTML = '';

  const title = document.createElement('div');
  title.className = 'word-title';
  title.textContent = word;

  const context = document.createElement('div');
  context.className = 'word-context';
  context.textContent = reply;

  panelBody.appendChild(title);
  panelBody.appendChild(context);
  panel?.classList.add('visible');
}

export function showTranslationResult(
  rect: DOMRect,
  original: string,
  translation: string,
): void {
  if (panelBody === null) return;
  positionElement(panel!, rect, 'panel');

  panelBody.innerHTML = '';

  const originalBlock = document.createElement('div');
  originalBlock.className = 'original-block';
  originalBlock.textContent = original;

  const translationText = document.createElement('div');
  translationText.className = 'translation-text';
  translationText.textContent = translation;

  panelBody.appendChild(originalBlock);
  panelBody.appendChild(translationText);
  panel?.classList.add('visible');
}

export function showError(rect: DOMRect, message: string): void {
  if (panelBody === null) return;
  positionElement(panel!, rect, 'panel');
  panelBody.innerHTML = `<div class="error">翻译失败：${message}</div>`;
  panel?.classList.add('visible');
}

export function hide(): void {
  hideDot();
  panel?.classList.remove('visible');
  if (panelBody !== null) {
    panelBody.innerHTML = '';
  }
}
