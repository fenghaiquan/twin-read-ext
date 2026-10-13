/**
 * Content script placeholder.
 *
 * Responsibilities (see docs/adr):
 * - DOM traversal, text extraction, and bilingual node injection (ADR-002).
 * - Selection (mouseup) listening and Shadow DOM tooltip rendering (ADR-003).
 * - NEVER issue network requests directly; always talk to the background
 *   service worker via chrome.runtime.sendMessage.
 *
 * Selection translation will be implemented in Sprint 2.
 */
export {};
