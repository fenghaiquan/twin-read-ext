/**
 * Background service worker placeholder.
 *
 * Responsibilities (see docs/adr):
 * - Own ALL outbound HTTP requests to the LLM provider (ADR-001).
 * - Read provider settings from chrome.storage.
 * - Listen for TranslationRequest messages from content scripts.
 *
 * Business logic will be implemented in Sprint 1 (llm-client).
 */
export {};
