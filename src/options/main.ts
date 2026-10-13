/**
 * Options page entry (three tabs: 模型 / 行为 / 关于).
 *
 * 模型 tab — ProviderSettings load/save in chrome.storage.local, host-permission
 * request inside the click gesture, provider preset chips, model list fetch and
 * connection probe via the background service worker (ADR-001: UI never issues
 * network requests directly).
 *
 * 行为 tab — BehaviorSettings toggles/selects persist immediately
 * (chrome.storage.local); the content script reacts via storage.onChanged.
 */

import { DEFAULT_ORIGIN_PATTERN, originPatternFromBaseUrl } from '@shared/permissions';
import { PROVIDER_PRESETS, matchPreset, type ProviderPreset } from '@shared/providers';
import {
  DEFAULT_BEHAVIOR_SETTINGS,
  DEFAULT_PROVIDER_SETTINGS,
  LANGUAGE_LABELS,
  SOURCE_LANGUAGES,
  STORAGE_KEYS,
  TARGET_LANGUAGES,
  type BehaviorSettings,
  type ModelListResult,
  type ProviderSettings,
  type SourceLanguage,
  type TargetLanguage,
  type TestConnectionResult,
} from '@shared/types';

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`缺少元素：${selector}`);
  return element;
}

// ── Model tab ───────────────────────────────────────────────
const platformChips = requireElement<HTMLDivElement>('#platform-chips');
const providerHintEl = requireElement<HTMLParagraphElement>('#provider-hint');
const baseUrlInput = requireElement<HTMLInputElement>('#base-url');
const apiKeyInput = requireElement<HTMLInputElement>('#api-key');
const modelInput = requireElement<HTMLInputElement>('#model');
const modelSuggestions = requireElement<HTMLDataListElement>('#model-suggestions');
const fetchModelsBtn = requireElement<HTMLButtonElement>('#fetch-models-btn');
const saveBtn = requireElement<HTMLButtonElement>('#save-btn');
const testBtn = requireElement<HTMLButtonElement>('#test-btn');
const statusEl = requireElement<HTMLDivElement>('#status');
const statusTextEl = requireElement<HTMLSpanElement>('#status-text');

// ── Behavior tab ────────────────────────────────────────────
const selectionToggle = requireElement<HTMLButtonElement>('#toggle-selection');
const sourceSelect = requireElement<HTMLSelectElement>('#source-language');
const targetSelect = requireElement<HTMLSelectElement>('#target-language');

// ── About tab / chrome ──────────────────────────────────────
const versionEl = requireElement<HTMLSpanElement>('#app-version');

const CUSTOM_CHIP_ID = 'custom';

function setStatus(text: string, kind: 'ok' | 'error' | 'pending' | ''): void {
  statusEl.hidden = !text; // empty state renders no pill
  statusTextEl.textContent = text;
  const style = kind === 'ok' ? 'status-success' : kind === 'error' ? 'status-error' : kind === 'pending' ? 'status-pending' : 'status-idle';
  statusEl.className = `status ${style}`;
  const indicator = document.createElement('span');
  indicator.className = kind === 'pending' ? 'spinner' : 'status-dot';
  statusEl.replaceChildren(indicator, statusTextEl);
}

/** Green "已保存 ✓" flash on the primary button (1.5s), demo micro-interaction. */
function flashSaved(): void {
  saveBtn.textContent = '已保存 ✓';
  saveBtn.classList.add('btn-saved');
  window.setTimeout(() => {
    saveBtn.textContent = '保存设置';
    saveBtn.classList.remove('btn-saved');
  }, 1500);
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
  if (showStatus) {
    setStatus('已保存。', 'ok');
    flashSaved();
  }
  return true;
}

async function loadSettings(): Promise<void> {
  const stored = await chrome.storage.local.get<Record<string, Partial<ProviderSettings>>>(
    STORAGE_KEYS.providerSettings,
  );
  const raw = stored[STORAGE_KEYS.providerSettings];
  baseUrlInput.value = raw?.baseUrl || DEFAULT_PROVIDER_SETTINGS.baseUrl;
  apiKeyInput.value = raw?.apiKey ?? '';
  modelInput.value = raw?.model || DEFAULT_PROVIDER_SETTINGS.model;
  syncPlatformChips();
}

// ── Platform preset chips (single source of truth: shared presets) ──

function populatePlatformChips(): void {
  const items: Array<{ id: string; name: string }> = [
    ...PROVIDER_PRESETS.map((preset) => ({ id: preset.id, name: preset.name })),
    { id: CUSTOM_CHIP_ID, name: '自定义' },
  ];
  for (const item of items) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.dataset.platform = item.id;
    chip.textContent = item.name;
    chip.addEventListener('click', () => onChipClick(item.id));
    platformChips.appendChild(chip);
  }
}

function onChipClick(id: string): void {
  if (id === CUSTOM_CHIP_ID) {
    baseUrlInput.value = '';
    apiKeyInput.value = '';
    syncPlatformChips();
    return;
  }
  const preset = PROVIDER_PRESETS.find((p) => p.id === id);
  if (preset) {
    baseUrlInput.value = preset.baseUrl;
    modelInput.value = preset.model;
    apiKeyInput.value = '';
  }
  syncPlatformChips();
}

/** Highlight the chip matching current form values (or the custom chip). */
function syncPlatformChips(): void {
  const { baseUrl, model } = readForm();
  const preset = matchPreset(baseUrl, model);
  const activeId = preset ? preset.id : CUSTOM_CHIP_ID;
  for (const chip of platformChips.children) {
    if (chip instanceof HTMLButtonElement) {
      chip.classList.toggle('active', chip.dataset.platform === activeId);
    }
  }
  renderPresetHint(preset);
}

/** Show the "where to get a key" hint under the chips (empty for custom). */
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

// ── Model list fetch (background GET /models, ADR-001) ──────

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

// ── Connection probe (background round-trip, ADR-001) ───────

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

// ── Behavior tab (immediate persistence, no save button) ────

function populateLanguageOptions(): void {
  for (const language of SOURCE_LANGUAGES) {
    sourceSelect.add(new Option(LANGUAGE_LABELS[language], language));
  }
  for (const language of TARGET_LANGUAGES) {
    targetSelect.add(new Option(LANGUAGE_LABELS[language], language));
  }
}

async function loadBehaviorSettings(): Promise<void> {
  const stored = await chrome.storage.local.get<Record<string, Partial<BehaviorSettings>>>(
    STORAGE_KEYS.behaviorSettings,
  );
  const raw = stored[STORAGE_KEYS.behaviorSettings];
  selectionToggle.classList.toggle('on', raw?.selectionEnabled !== false);
  sourceSelect.value = SOURCE_LANGUAGES.includes(raw?.sourceLanguage as SourceLanguage)
    ? (raw?.sourceLanguage as SourceLanguage)
    : DEFAULT_BEHAVIOR_SETTINGS.sourceLanguage;
  targetSelect.value = TARGET_LANGUAGES.includes(raw?.targetLanguage as TargetLanguage)
    ? (raw?.targetLanguage as TargetLanguage)
    : DEFAULT_BEHAVIOR_SETTINGS.targetLanguage;
}

function readBehaviorForm(): BehaviorSettings {
  return {
    selectionEnabled: selectionToggle.classList.contains('on'),
    sourceLanguage: sourceSelect.value as SourceLanguage,
    targetLanguage: targetSelect.value as TargetLanguage,
  };
}

function persistBehaviorSettings(): void {
  void chrome.storage.local.set({ [STORAGE_KEYS.behaviorSettings]: readBehaviorForm() });
}

// ── Tabs / accordion wiring ─────────────────────────────────

function wireTabs(): void {
  const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>('.tab'));
  const contents = Array.from(document.querySelectorAll<HTMLElement>('.tab-content'));
  for (const tab of tabs) {
    tab.addEventListener('click', () => {
      for (const other of tabs) other.classList.toggle('active', other === tab);
      for (const content of contents) {
        content.classList.toggle('active', content.id === `tab-${tab.dataset.tab}`);
      }
    });
  }
}

// ── Boot ────────────────────────────────────────────────────

saveBtn.addEventListener('click', () => {
  void saveSettings();
});
testBtn.addEventListener('click', () => {
  void testConnection();
});
fetchModelsBtn.addEventListener('click', () => {
  void fetchModelList();
});
selectionToggle.addEventListener('click', () => {
  selectionToggle.classList.toggle('on');
  persistBehaviorSettings();
});
sourceSelect.addEventListener('change', persistBehaviorSettings);
targetSelect.addEventListener('change', persistBehaviorSettings);

wireTabs();
populatePlatformChips();
populateLanguageOptions();
versionEl.textContent = chrome.runtime.getManifest().version;
void loadSettings();
void loadBehaviorSettings();
