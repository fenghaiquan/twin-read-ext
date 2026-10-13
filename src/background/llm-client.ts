/**
 * LLM client running inside the background service worker.
 *
 * Per ADR-001 this is the ONLY module allowed to issue outbound HTTP
 * requests. All config is read from chrome.storage.local.
 */

import {
  DEFAULT_PROVIDER_SETTINGS,
  STORAGE_KEYS,
  type ProviderSettings,
  type TestConnectionResult,
  type TranslationRequest,
  type TranslationResponse,
} from '@shared/types';
import { buildChatCompletionBody, buildChatCompletionsUrl, type ChatMessage } from '@core-llm/chat';
import { buildTestConnectionMessages, buildTranslationMessages } from '@core-llm/prompt';
import { parseTranslationReply } from '@core-llm/parse';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Read provider settings from storage, falling back to Qwen defaults. */
export async function getProviderSettings(): Promise<ProviderSettings> {
  const stored = await chrome.storage.local.get<Record<string, Partial<ProviderSettings>>>(
    STORAGE_KEYS.providerSettings,
  );
  const raw = stored[STORAGE_KEYS.providerSettings];
  if (!isRecord(raw)) return { ...DEFAULT_PROVIDER_SETTINGS };
  return {
    baseUrl: typeof raw.baseUrl === 'string' && raw.baseUrl.trim() ? raw.baseUrl.trim() : DEFAULT_PROVIDER_SETTINGS.baseUrl,
    apiKey: typeof raw.apiKey === 'string' ? raw.apiKey.trim() : '',
    model: typeof raw.model === 'string' && raw.model.trim() ? raw.model.trim() : DEFAULT_PROVIDER_SETTINGS.model,
  };
}

/** Send one ChatCompletion request and return the assistant reply text. */
async function chatCompletion(settings: ProviderSettings, messages: ChatMessage[]): Promise<string> {
  if (!settings.apiKey) throw new Error('尚未配置 API Key，请先在设置页填写并保存');
  const response = await fetch(buildChatCompletionsUrl(settings.baseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify(buildChatCompletionBody(settings.model, messages)),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new Error(`API 请求失败（HTTP ${response.status}）：${detail}`);
  }
  return extractReply(await response.json());
}

function extractReply(data: unknown): string {
  if (!isRecord(data) || !Array.isArray(data.choices) || !isRecord(data.choices[0])) {
    throw new Error('API 响应格式异常：缺少 choices[0]');
  }
  const choice = data.choices[0];
  if (!isRecord(choice.message) || typeof choice.message.content !== 'string') {
    throw new Error('API 响应格式异常：缺少 choices[0].message.content');
  }
  return choice.message.content;
}

/** Probe the provider with a tiny round-trip message (Options "测试连接"). */
export async function testConnection(): Promise<TestConnectionResult> {
  try {
    const settings = await getProviderSettings();
    const reply = await chatCompletion(settings, buildTestConnectionMessages());
    return { success: true, reply: reply.trim() };
  } catch (error) {
    return { success: false, errorMessage: toErrorMessage(error) };
  }
}

/** Translate a batch per the TranslationRequest/Response contract. */
export async function translate(request: TranslationRequest): Promise<TranslationResponse> {
  if (request.texts.length === 0) {
    return { id: request.id, success: true, translatedTexts: [] };
  }
  try {
    const settings = await getProviderSettings();
    const content = await chatCompletion(settings, buildTranslationMessages(request));
    return { id: request.id, success: true, translatedTexts: parseTranslationReply(content, request) };
  } catch (error) {
    return { id: request.id, success: false, translatedTexts: [], errorMessage: toErrorMessage(error) };
  }
}

export function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
