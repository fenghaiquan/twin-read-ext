/**
 * Content script entry: context-aware selection translation (Sprint 2).
 *
 * Flow (constitution: no direct network access):
 *   mouseup -> show dot indicator
 *   dot click -> buildSelectionRequest -> chrome.runtime.sendMessage('translate')
 *   -> background/llm-client -> response -> Shadow DOM panel (ADR-003)
 */

import type { TranslationResponse } from '@shared/types';
import { classifySelection } from '@shared/selection';
import { buildSelectionRequest } from './selection';
import {
  getPanelHost,
  hide,
  hideDot,
  openPanel,
  showError,
  showDot,
  showTranslationResult,
  showWordResult,
} from './panel';

function isPanelEventTarget(target: EventTarget | null): boolean {
  const host = getPanelHost();
  return target instanceof Node && host !== null && (host === target || host.contains(target));
}

function getSelectionRect(): DOMRect | null {
  const selection = window.getSelection();
  if (selection === null || selection.rangeCount === 0) return null;
  const rect = selection.getRangeAt(0).getBoundingClientRect();
  return rect.width === 0 && rect.height === 0 ? null : rect;
}

async function handleDotClick(): Promise<void> {
  const request = buildSelectionRequest();
  if (request === null) return;

  const rect = getSelectionRect();
  if (rect === null) return;

  hideDot(); // hide dot when panel opens
  openPanel(rect);

  const response = (await chrome.runtime.sendMessage({
    type: 'translate',
    request,
  })) as TranslationResponse | undefined;

  renderResponse(response, request, rect);
}

function renderResponse(
  response: TranslationResponse | undefined,
  request: { id: string; texts: string[]; type: 'selection' | 'full-page' },
  rect: DOMRect,
): void {
  if (response === undefined || response.id !== request.id) {
    showError(rect, '后台无响应，请到 chrome://extensions 重新加载扩展后重试');
    return;
  }
  if (!response.success) {
    showError(rect, response.errorMessage ?? '未知错误');
    return;
  }

  const selected = request.texts[0] ?? '';
  const mode = classifySelection(selected);
  const translation = response.translatedTexts[0] ?? '';

  if (mode === 'word') {
    showWordResult(rect, selected, translation);
  } else {
    showTranslationResult(rect, selected, translation);
  }
}

document.addEventListener('mouseup', (event: MouseEvent) => {
  if (isPanelEventTarget(event.target)) return;

  const rect = getSelectionRect();
  if (rect === null) return;

  // Check if there's actual selection text
  const selection = window.getSelection();
  if (selection === null || selection.isCollapsed) {
    hide();
    return;
  }

  const text = selection.toString().trim();
  if (!text || text.length > 300) {
    hide();
    return;
  }

  showDot(rect);
});

document.addEventListener('mousedown', (event: MouseEvent) => {
  if (!isPanelEventTarget(event.target)) hide();
});

document.addEventListener('keydown', (event: KeyboardEvent) => {
  if (event.key === 'Escape') hide();
});

window.addEventListener('scroll', () => hide(), { passive: true });

// Listen for dot clicks from the panel shadow DOM
document.addEventListener('twin-read-dot-clicked', () => {
  void handleDotClick();
});
