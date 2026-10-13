/**
 * Content script entry: context-aware selection translation (Sprint 2).
 *
 * Flow (constitution: no direct network access):
 *   mouseup -> buildSelectionRequest -> chrome.runtime.sendMessage('translate')
 *   -> background/llm-client -> response -> Shadow DOM tooltip (ADR-003).
 */

import type { TranslationResponse } from '@shared/types';
import { buildSelectionRequest } from './selection';
import {
  getTooltipHost,
  hideTooltip,
  showTooltipError,
  showTooltipLoading,
  showTooltipText,
} from './tooltip';

function isTooltipEventTarget(target: EventTarget | null): boolean {
  const host = getTooltipHost();
  return target instanceof Node && host !== null && (host === target || host.contains(target));
}

function getSelectionRect(): DOMRect | null {
  const selection = window.getSelection();
  if (selection === null || selection.rangeCount === 0) return null;
  const rect = selection.getRangeAt(0).getBoundingClientRect();
  return rect.width === 0 && rect.height === 0 ? null : rect;
}

async function handleSelectionMouseUp(event: MouseEvent): Promise<void> {
  if (isTooltipEventTarget(event.target)) return;
  const request = buildSelectionRequest();
  if (request === null) return;
  const rect = getSelectionRect();
  if (rect === null) return;
  showTooltipLoading(rect);
  const response = (await chrome.runtime.sendMessage({
    type: 'translate',
    request,
  })) as TranslationResponse | undefined;
  renderResponse(response, request.id, rect);
}

function renderResponse(
  response: TranslationResponse | undefined,
  requestId: string,
  rect: DOMRect,
): void {
  if (response === undefined || response.id !== requestId) {
    showTooltipError(rect, '后台无响应，请到 chrome://extensions 重新加载扩展后重试');
    return;
  }
  if (!response.success) {
    showTooltipError(rect, response.errorMessage ?? '未知错误');
    return;
  }
  showTooltipText(rect, response.translatedTexts[0] ?? '');
}

document.addEventListener('mouseup', (event: MouseEvent) => {
  void handleSelectionMouseUp(event);
});

document.addEventListener('mousedown', (event: MouseEvent) => {
  if (!isTooltipEventTarget(event.target)) hideTooltip();
});

document.addEventListener('keydown', (event: KeyboardEvent) => {
  if (event.key === 'Escape') hideTooltip();
});

window.addEventListener('scroll', () => hideTooltip(), { passive: true });
