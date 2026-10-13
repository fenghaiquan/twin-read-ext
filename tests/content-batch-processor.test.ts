// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import {
  chunkBlocks,
  DEFAULT_BATCH_SIZE,
  MAX_BATCH_CHARS,
} from '../src/content/batch-processor';
import type { BlockTarget } from '../src/content/dom-parser';

function makeBlocks(texts: string[]): BlockTarget[] {
  return texts.map((text) => ({
    element: document.createElement('p'),
    text,
  }));
}

describe('chunkBlocks', () => {
  it('returns an empty list for no blocks', () => {
    expect(chunkBlocks([])).toEqual([]);
  });

  it('splits blocks into batches of at most batchSize', () => {
    const blocks = makeBlocks(Array.from({ length: 45 }, (_, i) => `text ${i}`));
    const batches = chunkBlocks(blocks, 20, 10_000);
    expect(batches.map((batch) => batch.texts.length)).toEqual([20, 20, 5]);
  });

  it('starts a new batch when the character budget is exceeded', () => {
    const blocks = makeBlocks(['a'.repeat(100), 'b'.repeat(100), 'c'.repeat(150)]);
    // budget 200 chars: [a(100)+b(100)] then c(150) alone
    const batches = chunkBlocks(blocks, 20, 200);
    expect(batches.map((batch) => batch.texts.length)).toEqual([2, 1]);
  });

  it('puts one oversized block into its own batch rather than dropping it', () => {
    const blocks = makeBlocks(['short', 'x'.repeat(500)]);
    const batches = chunkBlocks(blocks, 20, 300);
    expect(batches.map((batch) => batch.texts.length)).toEqual([1, 1]);
    expect(batches[1]?.texts[0]).toBe('x'.repeat(500));
  });

  it('keeps anchor references aligned with texts for 1:1 injection (ADR-004)', () => {
    const blocks = makeBlocks(['aa', 'bb', 'cc']);
    const batches = chunkBlocks(blocks, 2, 10_000);
    expect(batches[0]?.anchors).toEqual([blocks[0]!.element, blocks[1]!.element]);
    expect(batches[0]?.anchors[0]).toBe(blocks[0]!.element); // same reference, not a clone
    expect(batches[0]?.texts).toEqual(['aa', 'bb']);
    expect(batches[1]?.anchors).toEqual([blocks[2]!.element]);
  });

  it('uses sensible defaults', () => {
    expect(DEFAULT_BATCH_SIZE).toBe(20);
    expect(MAX_BATCH_CHARS).toBeGreaterThan(0);
  });
});
