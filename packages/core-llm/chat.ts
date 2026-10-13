/**
 * OpenAI-compatible ChatCompletions wire format (ADR-001).
 *
 * Pure functions only: no chrome.*, no DOM, no network access.
 * The background service worker is the sole consumer that performs fetch().
 */

export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatCompletionBody {
  model: string;
  messages: ChatMessage[];
  temperature: number;
  stream: false;
}

/** Build the POST body for `{baseUrl}/chat/completions`. */
export function buildChatCompletionBody(
  model: string,
  messages: ChatMessage[],
  temperature = 0.3,
): ChatCompletionBody {
  return { model, messages, temperature, stream: false };
}

/** Join a provider base URL with the ChatCompletions path (trims trailing slashes). */
export function buildChatCompletionsUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
}
