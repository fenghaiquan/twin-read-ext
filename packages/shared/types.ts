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
