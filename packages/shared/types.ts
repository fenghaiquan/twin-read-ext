/**
 * Shared type contracts (see docs/adr and README).
 *
 * These types are the single source of truth for communication between
 * modules. All modules must import from here instead of re-declaring
 * their own shapes.
 */

/** Contract 1: provider configuration data model. */
export interface ProviderSettings {
  /** OpenAI-compatible base URL. Default: https://dashscope.aliyuncs.com/compatible-mode/v1 */
  baseUrl: string;
  apiKey: string;
  /** Model name. Default: qwen-plus */
  model: string;
}

export const DEFAULT_PROVIDER_SETTINGS: ProviderSettings = {
  baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  apiKey: '',
  model: 'qwen-plus',
};

/** Contract 2: translation request (selection / full-page). */
export interface TranslationRequest {
  id: string;
  type: 'full-page' | 'selection';
  /** Texts to translate. For 'full-page' this is one batch of paragraphs. */
  texts: string[];
  /** Surrounding paragraph text for context-aware selection translation. */
  context?: string;
}

/** Contract 3: translation response (must map 1:1 onto request.texts). */
export interface TranslationResponse {
  id: string;
  success: boolean;
  translatedTexts: string[];
  errorMessage?: string;
}

/** Contract 4: messages sent to the background service worker. */
export interface TestConnectionMessage {
  type: 'test-connection';
}

export interface ListModelsMessage {
  type: 'list-models';
  /** Form values (may not be persisted yet) — background fetches with these. */
  baseUrl: string;
  apiKey: string;
}

export interface TranslateMessage {
  type: 'translate';
  request: TranslationRequest;
}

export type BackgroundMessage = TestConnectionMessage | ListModelsMessage | TranslateMessage;

/** Result of a 'list-models' message. */
export interface ModelListResult {
  success: boolean;
  models: string[];
  errorMessage?: string;
}

/** Result of a 'test-connection' message. */
export interface TestConnectionResult {
  success: boolean;
  reply?: string;
  errorMessage?: string;
}

/** Contract 5: messages sent from the popup to content scripts (chrome.tabs.sendMessage). */
export interface TogglePageTranslationMessage {
  type: 'toggle-page-translation';
}

export interface GetPageTranslationStateMessage {
  type: 'get-page-translation-state';
}

export type ContentMessage = TogglePageTranslationMessage | GetPageTranslationStateMessage;

/** Result of a ContentMessage. */
export interface ContentMessageResult {
  /** Whether full-page translation is currently enabled on the tab. */
  enabled: boolean;
}

/** chrome.storage.local keys owned by this extension. */
export const STORAGE_KEYS = {
  providerSettings: 'providerSettings',
  behaviorSettings: 'behaviorSettings',
} as const;

/** Source language option for prompts ('auto' = let the model detect). */
export type SourceLanguage = 'auto' | 'en' | 'ja' | 'ko' | 'fr' | 'de' | 'es';
export const SOURCE_LANGUAGES: readonly SourceLanguage[] = ['auto', 'en', 'ja', 'ko', 'fr', 'de', 'es'];

/** Target language option for prompts. */
export type TargetLanguage = 'zh-CN' | 'zh-TW' | 'en';
export const TARGET_LANGUAGES: readonly TargetLanguage[] = ['zh-CN', 'zh-TW', 'en'];

/** Display labels for the Options language dropdowns. */
export const LANGUAGE_LABELS: Record<SourceLanguage | TargetLanguage, string> = {
  auto: '自动检测',
  en: 'English',
  ja: '日语',
  ko: '韩语',
  fr: '法语',
  de: '德语',
  es: '西班牙语',
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
};

/** User-facing behavior settings (Options「行为」tab; content/background consume). */
export interface BehaviorSettings {
  /** false = content script ignores text selections entirely. */
  selectionEnabled: boolean;
  sourceLanguage: SourceLanguage;
  targetLanguage: TargetLanguage;
}

export const DEFAULT_BEHAVIOR_SETTINGS: BehaviorSettings = {
  selectionEnabled: true,
  sourceLanguage: 'auto',
  targetLanguage: 'zh-CN',
};
