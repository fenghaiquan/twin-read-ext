/**
 * Batch chunking for full-page translation (Sprint 3, TDD).
 *
 * Groups Text nodes into batches bounded by BOTH node count and total
 * characters, so each LLM request stays small. Node references are kept
 * alongside the texts for 1:1 DOM injection in Sprint 4 (ADR-002).
 */

export const DEFAULT_BATCH_SIZE = 20;
export const MAX_BATCH_CHARS = 2000;

export interface TextBatch {
  /** Node references aligned with texts[i] for 1:1 injection (ADR-002). */
  nodes: Text[];
  /** Plain texts sent to the LLM as request.texts. */
  texts: string[];
}

/** Split text nodes into batches of at most batchSize nodes / maxChars characters. */
export function chunkTextNodes(
  nodes: Text[],
  batchSize: number = DEFAULT_BATCH_SIZE,
  maxChars: number = MAX_BATCH_CHARS,
): TextBatch[] {
  const batches: TextBatch[] = [];
  let current: Text[] = [];
  let charCount = 0;

  for (const node of nodes) {
    const text = node.nodeValue ?? '';
    const budgetReached =
      current.length > 0 &&
      (current.length >= batchSize || charCount + text.length > maxChars);
    if (budgetReached) {
      batches.push(toBatch(current));
      current = [];
      charCount = 0;
    }
    current.push(node);
    charCount += text.length;
  }

  if (current.length > 0) batches.push(toBatch(current));
  return batches;
}

function toBatch(nodes: Text[]): TextBatch {
  return {
    nodes: [...nodes],
    texts: nodes.map((node) => node.nodeValue ?? ''),
  };
}
