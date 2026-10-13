/**
 * Selection-mode classification: decides whether a selection is a
 * single word/phrase or a longer sentence/paragraph, so the UI and
 * the LLM prompt can adapt (see ADR-001).
 */

export type SelectionMode = 'word' | 'paragraph';

/**
 * Heuristic:
 * - ≤ 3 whitespace tokens AND no sentence-ending punctuation → word
 * - otherwise → paragraph
 */
export function classifySelection(text: string): SelectionMode {
  const trimmed = text.trim();
  if (!trimmed) return 'paragraph';
  const tokens = trimmed.split(/\s+/).filter(Boolean).length;
  const hasSentencePunctuation = /[.!?;。！？；\n]/.test(trimmed);
  return tokens <= 3 && !hasSentencePunctuation ? 'word' : 'paragraph';
}
