/**
 * Content script entry (Sprint 2 + 4 + 4.1).
 *
 * Selection translation (constitution: no direct network access):
 *   mouseup (valid selection) -> snapshot request + rect -> show dot
 *   dot click -> use the snapshot (NOT the live selection, which the
 *   browser clears on mousedown) -> sendMessage -> panel (ADR-003)
 *
 * Full-page translation (Sprint 4 + 4.1, ADR-004):
 *   popup toggle -> PageTranslationController manages:
 *   - extractBlockTargets: leaf block-level anchors (p/li/h1-h6...)
 *   - IntersectionObserver: lazy translation (viewport-driven)
 *   - In-memory cache: instant toggle off→on
 *   - Pending markers: "… 翻译中" shown during API call
 *   - runToken: drop stale responses after cancel
 */

import { STORAGE_KEYS } from '@shared/types';
import type {
  ContentMessage,
  ContentMessageResult,
  TranslationRequest,
  TranslationResponse,
} from '@shared/types';
import { classifySelection } from '@shared/selection';
import { readSelectionEnabled } from './behavior';
import { buildSelectionRequest } from './selection';
import { PageTranslationController } from './page-translation';
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

/* ------------------------------------------------------------------ */
/* Selection translation (Sprint 2)                                    */
/* ------------------------------------------------------------------ */

/**
 * Snapshot of the selection captured at mouseup time. The browser clears
 * the selection on the dot's mousedown, so the live selection can no longer
 * be trusted once the dot is clicked.
 */
let pendingRequest: TranslationRequest | null = null;
let pendingRect: DOMRect | null = null;

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

function hideAll(): void {
  pendingRequest = null;
  pendingRect = null;
  hide();
}

async function handleDotClick(): Promise<void> {
  const request = pendingRequest;
  const rect = pendingRect;
  if (request === null || rect === null) return;

  pendingRequest = null; // consume the snapshot; one dot click = one translation
  hideDot();
  openPanel(rect);

  const response = (await chrome.runtime.sendMessage({
    type: 'translate',
    request,
  })) as TranslationResponse | undefined;

  renderSelectionResponse(response, request, rect);
}

function renderSelectionResponse(
  response: TranslationResponse | undefined,
  request: TranslationRequest,
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
  const translation = response.translatedTexts[0] ?? '';

  if (classifySelection(selected) === 'word') {
    showWordResult(rect, selected, translation);
  } else {
    showTranslationResult(rect, selected, translation);
  }
}

/** Behavior switch (Options「行为」tab): false = ignore selections entirely. */
let selectionEnabled = true;

void chrome.storage.local.get(STORAGE_KEYS.behaviorSettings).then((stored) => {
  selectionEnabled = readSelectionEnabled(stored[STORAGE_KEYS.behaviorSettings]);
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  const change = changes[STORAGE_KEYS.behaviorSettings];
  if (!change) return;
  selectionEnabled = readSelectionEnabled(change.newValue);
  if (!selectionEnabled) hideAll();
});

document.addEventListener('mouseup', (event: MouseEvent) => {
  if (isPanelEventTarget(event.target)) return;
  if (!selectionEnabled) return;

  const request = buildSelectionRequest();
  if (request === null) {
    hideAll();
    return;
  }
  const rect = getSelectionRect();
  if (rect === null) {
    hideAll();
    return;
  }

  pendingRequest = request;
  pendingRect = rect;
  showDot(rect);
});

document.addEventListener('mousedown', (event: MouseEvent) => {
  if (!isPanelEventTarget(event.target)) hideAll();
});

document.addEventListener('keydown', (event: KeyboardEvent) => {
  if (event.key === 'Escape') hideAll();
});

window.addEventListener('scroll', () => hideAll(), { passive: true });

// The dot lives inside a closed ShadowRoot; its click is re-emitted from the
// host element as a composed custom event.
document.addEventListener('twin-read-dot-clicked', () => {
  void handleDotClick();
});

/* ------------------------------------------------------------------ */
/* Full-page translation (Sprint 4.1, ADR-004)                         */
/* ------------------------------------------------------------------ */

const pageController = new PageTranslationController({
  sendMessage: (message) =>
    chrome.runtime.sendMessage(message) as Promise<TranslationResponse | undefined>,
  root: document.documentElement,
});

function isContentMessage(message: unknown): message is ContentMessage {
  if (typeof message !== 'object' || message === null) return false;
  const { type } = message as { type?: unknown };
  return type === 'toggle-page-translation' || type === 'get-page-translation-state';
}

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (!isContentMessage(message)) return false;
  if (message.type === 'get-page-translation-state') {
    sendResponse({ enabled: pageController.isEnabled() } satisfies ContentMessageResult);
    return false;
  }
  void pageController.toggle().then((result) => sendResponse(result));
  return true; // keep the channel open for the async response
});
