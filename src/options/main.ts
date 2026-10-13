/**
 * Options page entry: load/save ProviderSettings in chrome.storage.local
 * and probe the provider via the background service worker (ADR-001:
 * UI never issues network requests directly).
 */

import {
  DEFAULT_PROVIDER_SETTINGS,
  STORAGE_KEYS,
  type ProviderSettings,
  type TestConnectionResult,
} from '@shared/types';

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`缺少元素：${selector}`);
  return element;
}

const baseUrlInput = requireElement<HTMLInputElement>('#base-url');
const apiKeyInput = requireElement<HTMLInputElement>('#api-key');
const modelInput = requireElement<HTMLInputElement>('#model');
const saveBtn = requireElement<HTMLButtonElement>('#save-btn');
const testBtn = requireElement<HTMLButtonElement>('#test-btn');
const statusEl = requireElement<HTMLParagraphElement>('#status');

function setStatus(text: string, kind: 'ok' | 'error' | 'pending' | ''): void {
  statusEl.textContent = text;
  statusEl.className = kind;
}

async function loadSettings(): Promise<void> {
  const stored = await chrome.storage.local.get<Record<string, Partial<ProviderSettings>>>(
    STORAGE_KEYS.providerSettings,
  );
  const raw = stored[STORAGE_KEYS.providerSettings];
  baseUrlInput.value = raw?.baseUrl || DEFAULT_PROVIDER_SETTINGS.baseUrl;
  apiKeyInput.value = raw?.apiKey ?? '';
  modelInput.value = raw?.model || DEFAULT_PROVIDER_SETTINGS.model;
}

function readForm(): ProviderSettings {
  return {
    baseUrl: baseUrlInput.value.trim() || DEFAULT_PROVIDER_SETTINGS.baseUrl,
    apiKey: apiKeyInput.value.trim(),
    model: modelInput.value.trim() || DEFAULT_PROVIDER_SETTINGS.model,
  };
}

async function saveSettings(showStatus = true): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.providerSettings]: readForm() });
  if (showStatus) setStatus('已保存。', 'ok');
}

async function testConnection(): Promise<void> {
  setStatus('正在测试连接…', 'pending');
  testBtn.disabled = true;
  try {
    await saveSettings(false);
    const result = (await chrome.runtime.sendMessage({ type: 'test-connection' })) as
      | TestConnectionResult
      | undefined;
    if (!result) {
      setStatus('测试失败：后台无响应，请到 chrome://extensions 重新加载扩展后重试。', 'error');
      return;
    }
    if (result.success) {
      setStatus(`连接成功！模型回复：${result.reply ?? ''}`, 'ok');
    } else {
      setStatus(`连接失败：${result.errorMessage ?? '未知错误'}`, 'error');
    }
  } finally {
    testBtn.disabled = false;
  }
}

saveBtn.addEventListener('click', () => {
  void saveSettings();
});
testBtn.addEventListener('click', () => {
  void testConnection();
});

void loadSettings();
