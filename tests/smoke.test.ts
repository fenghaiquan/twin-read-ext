import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PROVIDER_SETTINGS,
  type ProviderSettings,
  type TranslationRequest,
  type TranslationResponse,
} from '@shared/types';

describe('shared type contracts (smoke)', () => {
  it('ships a Qwen-compatible default provider config', () => {
    expect(DEFAULT_PROVIDER_SETTINGS.baseUrl).toBe(
      'https://dashscope.aliyuncs.com/compatible-mode/v1',
    );
    expect(DEFAULT_PROVIDER_SETTINGS.model).toBe('qwen-plus');
    expect(DEFAULT_PROVIDER_SETTINGS.apiKey).toBe('');
  });

  it('default settings satisfy ProviderSettings', () => {
    const settings: ProviderSettings = DEFAULT_PROVIDER_SETTINGS;
    expect(settings.baseUrl).toMatch(/^https:\/\//);
  });

  it('TranslationResponse can map 1:1 onto a request batch', () => {
    const request: TranslationRequest = {
      id: 'req-1',
      type: 'full-page',
      texts: ['Hello world', 'Goodbye world'],
    };
    const response: TranslationResponse = {
      id: request.id,
      success: true,
      translatedTexts: ['你好，世界', '再见，世界'],
    };
    expect(response.translatedTexts).toHaveLength(request.texts.length);
  });
});
