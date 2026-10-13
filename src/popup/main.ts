/**
 * Popup entry (Sprint 4): full-page translation toggle.
 *
 * Talks to the active tab's content script via chrome.tabs.sendMessage;
 * all LLM traffic stays in the background (ADR-001).
 */

import type { ContentMessage, ContentMessageResult } from '@shared/types';

const toggleButton = document.querySelector<HTMLButtonElement>('#toggle');
const statusLabel = document.querySelector<HTMLElement>('#status');
const optionsLink = document.querySelector<HTMLAnchorElement>('#open-options');

function render(state: ContentMessageResult | undefined): void {
  if (toggleButton === null || statusLabel === null) return;

  if (state === undefined) {
    toggleButton.disabled = true;
    toggleButton.textContent = '开启整页翻译';
    statusLabel.textContent = '此页面不可用，请在普通网页中重试';
    return;
  }
  toggleButton.disabled = false;
  toggleButton.textContent = state.enabled ? '关闭整页翻译' : '开启整页翻译';
  statusLabel.textContent = state.enabled ? '本页翻译已开启' : '本页未开启翻译';
}

async function sendToActiveTab(
  message: ContentMessage,
): Promise<ContentMessageResult | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id === undefined) return undefined;
  try {
    return (await chrome.tabs.sendMessage(tab.id, message)) as ContentMessageResult;
  } catch {
    return undefined; // no content script on this page (chrome://, store, etc.)
  }
}

if (toggleButton !== null) {
  toggleButton.addEventListener('click', () => {
    console.log('[twin-read] toggle button clicked');
    void sendToActiveTab({ type: 'toggle-page-translation' }).then((result) => {
      console.log('[twin-read] toggle response:', result);
      render(result);
    });
  });
}

if (optionsLink !== null) {
  optionsLink.addEventListener('click', (event) => {
    event.preventDefault();
    void chrome.runtime.openOptionsPage();
  });
}

// Reflect the tab's current state whenever the popup opens.
void sendToActiveTab({ type: 'get-page-translation-state' }).then(render);
