/**
 * Batch chunking for full-page translation (Sprint 3 + 4.1, TDD).
 *
 * Groups block targets into batches bounded by BOTH block count and total
 * characters, so each LLM request stays small. Element references are kept
 * alongside the texts for 1:1 DOM injection (ADR-002, ADR-004).
 */

import type { BlockTarget } from './dom-parser';

export const DEFAULT_BATCH_SIZE = 20;
export const MAX_BATCH_CHARS = 2000;

/** A batch of blocks to be translated together in one LLM request. */
export interface TranslationBatch {
  /** Element references aligned with texts[i] for 1:1 injection (ADR-004). */
  anchors: Element[];
  /** Plain texts sent to the LLM as request.texts. */
  texts: string[];
}

/** Split block targets into batches of at most batchSize blocks / maxChars characters. */
export function chunkBlocks(
  blocks: BlockTarget[],
  batchSize: number = DEFAULT_BATCH_SIZE,
  maxChars: number = MAX_BATCH_CHARS,
): TranslationBatch[] {
  const batches: TranslationBatch[] = [];
  let currentAnchors: Element[] = [];
  let currentTexts: string[] = [];
  let charCount = 0;

  for (const block of blocks) {
    const text = block.text;
    const budgetReached =
      currentAnchors.length > 0 &&
      (currentAnchors.length >= batchSize || charCount + text.length > maxChars);
    if (budgetReached) {
      batches.push({ anchors: [...currentAnchors], texts: [...currentTexts] });
      currentAnchors = [];
      currentTexts = [];
      charCount = 0;
    }
    currentAnchors.push(block.element);
    currentTexts.push(text);
    charCount += text.length;
  }

  if (currentAnchors.length > 0) {
    batches.push({ anchors: [...currentAnchors], texts: [...currentTexts] });
  }
  return batches;
}
