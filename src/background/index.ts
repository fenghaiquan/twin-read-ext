/**
 * Background service worker entry point.
 *
 * Responsibilities (see docs/adr):
 * - Own ALL outbound HTTP requests to the LLM provider (ADR-001).
 * - Route BackgroundMessage traffic between UI/content and llm-client.
 *
 * The listener returns `true` to keep the message channel open for the
 * async response (required by Manifest V3 service workers).
 */

import type { BackgroundMessage } from '@shared/types';
import { testConnection, translate } from './llm-client';

function isBackgroundMessage(message: unknown): message is BackgroundMessage {
  if (typeof message !== 'object' || message === null) return false;
  const { type } = message as { type?: unknown };
  if (type === 'test-connection') return true;
  if (type !== 'translate') return false;
  return typeof (message as { request?: { id?: unknown } }).request?.id === 'string';
}

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (!isBackgroundMessage(message)) return false;
  const respond = (payload: unknown): void => {
    sendResponse(payload);
  };
  if (message.type === 'test-connection') {
    void testConnection().then(respond);
  } else {
    void translate(message.request).then(respond);
  }
  return true; // keep the port open for the async reply
});
