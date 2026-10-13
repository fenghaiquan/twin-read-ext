/**
 * Pure helpers for deriving Chrome match patterns from user-configured
 * provider Base URLs (used by the Options page to request optional host
 * permissions — see manifest `optional_host_permissions`).
 */

import { DEFAULT_PROVIDER_SETTINGS } from './types';

/** Match pattern for the built-in default provider (already in host_permissions). */
export const DEFAULT_ORIGIN_PATTERN: string | null = originPatternFromBaseUrl(
  DEFAULT_PROVIDER_SETTINGS.baseUrl,
);

/**
 * Derive a Chrome match pattern (`scheme://host/*`) from a provider Base URL.
 *
 * Notes:
 * - Ports are stripped: Chrome match patterns cannot express ports and a
 *   portless pattern matches any port (required for local servers like Ollama).
 * - Returns `null` for empty or non-http(s) URLs so callers can reject the
 *   form before saving.
 */
export function originPatternFromBaseUrl(baseUrl: string): string | null {
  const trimmed = baseUrl.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (!url.hostname) return null;

  return `${url.protocol}//${url.hostname}/*`;
}

/**
 * Whether the Base URL points at a local runtime (Ollama/LM Studio etc.),
 * which does not require an API key. Invalid input counts as non-local so
 * the client still asks the user to configure a provider.
 */
export function isLocalBaseUrl(baseUrl: string): boolean {
  try {
    const { hostname } = new URL(baseUrl.trim());
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
}
