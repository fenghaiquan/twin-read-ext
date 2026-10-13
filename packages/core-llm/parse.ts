/**
 * Robust parsing of model replies back into the TranslationResponse contract.
 *
 * Full-page batches MUST return a JSON array of the same length and order as
 * the request (guarantees 1:1 DOM injection in Sprint 4).
 */

import type { TranslationRequest } from '@shared/types';

/** Parse a raw model reply into translated texts for the given request. */
export function parseTranslationReply(content: string, request: TranslationRequest): string[] {
  if (request.type === 'selection') {
    const trimmed = content.trim();
    if (!trimmed) throw new Error('模型返回了空内容');
    return [trimmed];
  }
  return parseJsonStringArray(content, request.texts.length);
}

/** Extract a JSON string array from a (possibly code-fenced) model reply. */
export function parseJsonStringArray(content: string, expectedLength: number): string[] {
  const parsed = tryParseJsonArray(content);
  if (parsed === undefined) {
    throw new Error('模型未返回合法的 JSON 数组，无法按索引对应注入');
  }
  if (parsed.length !== expectedLength) {
    throw new Error(`模型返回了 ${parsed.length} 项，与请求的 ${expectedLength} 项不一致，已拒绝注入`);
  }
  return parsed.map((item) => (typeof item === 'string' ? item : JSON.stringify(item)));
}

function tryParseJsonArray(content: string): unknown[] | undefined {
  const cleaned = stripCodeFence(content.trim());
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start === -1 || end <= start) return undefined;
  try {
    const parsed: unknown = JSON.parse(cleaned.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function stripCodeFence(text: string): string {
  const fence = /^```[a-zA-Z]*\s*([\s\S]*?)\s*```$/;
  const match = text.match(fence);
  return match?.[1] ?? text;
}
