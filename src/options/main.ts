/**
 * Options page entry: load/save ProviderSettings in chrome.storage.local
 * and probe the provider via the background service worker (ADR-001:
 * UI never issues network requests directly).
 */

import { DEFAULT_ORIGIN_PATTERN, originPatternFromBaseUrl } from '@shared/permissions';
import { PROVIDER_PRESETS, matchPreset, type ProviderPreset } from '@shared/providers';
import {
  DEFAULT_PROVIDER_SETTINGS,
  STORAGE_KEYS,
  type ModelListResult,
  type ProviderSettings,
  type TestConnectionResult,
} from '@shared/types';

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`缺少元素：${selector}`);
  return element;
}

const providerSelect = requireElement<HTMLSelectElement>('#provider');
const providerHintEl = requireElement<HTMLParagraphElement>('#provider-hint');
const baseUrlInput = requireElement<HTMLInputElement>('#base-url');
const apiKeyInput = requireElement<HTMLInputElement>('#api-key');
const modelInput = requireElement<HTMLInputElement>('#model');
const modelSuggestions = requireElement<HTMLDataListElement>('#model-suggestions');
const fetchModelsBtn = requireElement<HTMLButtonElement>('#fetch-models-btn');
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
  syncProviderSelect();
}

/** Render the preset dropdown once (single source of truth: shared presets). */
function populateProviderSelect(): void {
  for (const preset of PROVIDER_PRESETS) {
    const option = document.createElement('option');
    option.value = preset.id;
    option.textContent = preset.name;
    providerSelect.appendChild(option);
  }
}

/** Preselect the dropdown entry matching saved settings (or "custom"). */
function syncProviderSelect(): void {
  const settings = readForm();
  const preset = matchPreset(settings.baseUrl, settings.model);
  providerSelect.value = preset ? preset.id : 'custom';
  renderPresetHint(preset);
}

/** Show the "where to get a key" hint for a preset (empty for custom). */
function renderPresetHint(preset: ProviderPreset | null): void {
  providerHintEl.replaceChildren();
  if (!preset) return;
  const link = document.createElement('a');
  link.href = preset.keyUrl;
  link.target = '_blank';
  link.rel = 'noreferrer';
  link.textContent = '获取 API Key →';
  providerHintEl.append(`${preset.name}：${preset.keyHint} `);
  providerHintEl.appendChild(link);
}

function onProviderChange(): void {
  const preset = PROVIDER_PRESETS.find((p) => p.id === providerSelect.value) ?? null;
  if (preset) {
    baseUrlInput.value = preset.baseUrl;
    modelInput.value = preset.model;
  }
  renderPresetHint(preset);
}

function readForm(): ProviderSettings {
  return {
    baseUrl: baseUrlInput.value.trim() || DEFAULT_PROVIDER_SETTINGS.baseUrl,
    apiKey: apiKeyInput.value.trim(),
    model: modelInput.value.trim() || DEFAULT_PROVIDER_SETTINGS.model,
  };
}

/** Outcome of validating a Base URL and requesting optional host permission. */
type Authorization = 'valid' | 'invalid' | 'denied';

/**
 * Validate the Base URL and, for non-default origins, request host permission.
 * Must be called inside a user gesture (save / fetch-models click).
 */
async function authorizeOrigin(baseUrl: string): Promise<Authorization> {
  const pattern = originPatternFromBaseUrl(baseUrl);
  if (!pattern) return 'invalid';
  if (pattern !== DEFAULT_ORIGIN_PATTERN && !(await chrome.permissions.request({ origins: [pattern] }))) {
    return 'denied';
  }
  return 'valid';
}

/**
 * Persist the form after origin authorization. Returns false when the Base
 * URL is invalid or the origin was not granted (settings still saved).
 */
async function saveSettings(showStatus = true): Promise<boolean> {
  const settings = readForm();
  const auth = await authorizeOrigin(settings.baseUrl);
  if (auth === 'invalid') {
    setStatus('Base URL 无效，请检查格式（例如 https://api.example.com/v1）。', 'error');
    return false;
  }
  await chrome.storage.local.set({ [STORAGE_KEYS.providerSettings]: settings });
  if (auth === 'denied') {
    setStatus('设置已保存，但未授权该域名：浏览器会拦截发往它的请求。再次点击「保存设置」可重新申请授权。', 'error');
    return false;
  }
  if (showStatus) setStatus('已保存。', 'ok');
  return true;
}

async function testConnection(): Promise<void> {
  setStatus('正在测试连接…', 'pending');
  testBtn.disabled = true;
  try {
    const ready = await saveSettings(false);
    if (!ready) return;
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

/** Pull the provider's `GET /models` list into the model datalist. */
async function fetchModelList(): Promise<void> {
  const settings = readForm();
  const auth = await authorizeOrigin(settings.baseUrl);
  if (auth === 'invalid') {
    setStatus('Base URL 无效，请检查格式（例如 https://api.example.com/v1）。', 'error');
    return;
  }
  if (auth === 'denied') {
    setStatus('未授权该域名：浏览器会拦截发往它的请求，请重新点击「获取模型列表」并允许授权。', 'error');
    return;
  }
  setStatus('正在获取模型列表…', 'pending');
  fetchModelsBtn.disabled = true;
  try {
    const result = (await chrome.runtime.sendMessage({
      type: 'list-models',
      baseUrl: settings.baseUrl,
      apiKey: settings.apiKey,
    })) as ModelListResult | undefined;
    if (!result) {
      setStatus('获取失败：后台无响应，请到 chrome://extensions 重新加载扩展后重试。', 'error');
      return;
    }
    if (!result.success) {
      setStatus(`获取失败：${result.errorMessage ?? '未知错误'}`, 'error');
      return;
    }
    modelSuggestions.replaceChildren(
      ...result.models.map((model) => {
        const option = document.createElement('option');
        option.value = model;
        return option;
      }),
    );
    setStatus(`已获取 ${result.models.length} 个模型，点击「模型名称」输入框选择。`, 'ok');
  } finally {
    fetchModelsBtn.disabled = false;
  }
}

saveBtn.addEventListener('click', () => {
  void saveSettings();
});
testBtn.addEventListener('click', () => {
  void testConnection();
});
fetchModelsBtn.addEventListener('click', () => {
  void fetchModelList();
});
providerSelect.addEventListener('change', onProviderChange);

populateProviderSelect();
void loadSettings();
