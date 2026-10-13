/**
 * LLM client running inside the background service worker.
 *
 * Per ADR-001 this is the ONLY module allowed to issue outbound HTTP
 * requests. All config is read from chrome.storage.local.
 */

import {
  DEFAULT_PROVIDER_SETTINGS,
  STORAGE_KEYS,
  type ModelListResult,
  type ProviderSettings,
  type TestConnectionResult,
  type TranslationRequest,
  type TranslationResponse,
} from '@shared/types';
import { buildChatCompletionBody, buildChatCompletionsUrl, type ChatMessage } from '@core-llm/chat';
import { buildModelsUrl, parseModelsResponse } from '@core-llm/models';
import { isLocalBaseUrl } from '@shared/permissions';
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
  const local = isLocalBaseUrl(settings.baseUrl);
  if (!settings.apiKey && !local) {
    throw new Error('尚未配置 API Key，请先在设置页选择平台并填写');
  }
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (settings.apiKey) headers.Authorization = `Bearer ${settings.apiKey}`;
  let response: Response;
  try {
    response = await fetch(buildChatCompletionsUrl(settings.baseUrl), {
      method: 'POST',
      headers,
      body: JSON.stringify(buildChatCompletionBody(settings.model, messages)),
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`网络请求失败（${reason}）：请检查网络与 Base URL；若使用非默认服务商，请确认保存时已授权该域名`, {
      cause: error,
    });
  }
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new Error(httpErrorMessage(response.status, detail));
  }
  return extractReply(await response.json());
}

/** Map well-known HTTP statuses to actionable user-facing messages. */
function httpErrorMessage(status: number, detail: string): string {
  if (status === 401) return 'API Key 无效或未授权（HTTP 401），请到设置页检查 Key';
  if (status === 402) return '账户余额不足（HTTP 402），请到服务商控制台充值';
  if (status === 403) return '无权访问该模型（HTTP 403），请检查模型名称与 Key 权限';
  if (status === 429) return '请求过于频繁或配额不足（HTTP 429），请稍后重试';
  return `API 请求失败（HTTP ${status}）：${detail}`;
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

/** Fetch the provider's model list (`GET /models`) for the Options dropdown. */
export async function listModels(baseUrl: string, apiKey: string): Promise<ModelListResult> {
  const fail = (errorMessage: string): ModelListResult => ({ success: false, models: [], errorMessage });
  if (!apiKey && !isLocalBaseUrl(baseUrl)) return fail('尚未填写 API Key，无法获取模型列表');
  const headers: Record<string, string> = {};
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  let response: Response;
  try {
    response = await fetch(buildModelsUrl(baseUrl), { method: 'GET', headers });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return fail(`网络请求失败（${reason}）：请检查网络与 Base URL；若使用非默认服务商，请确认已授权该域名`);
  }
  if (!response.ok) return fail(httpErrorMessage(response.status, (await response.text()).slice(0, 300)));
  const models = parseModelsResponse(await response.json());
  if (models.length === 0) return fail('API 返回的模型列表为空或格式无法识别，可手动填写模型名');
  return { success: true, models };
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
