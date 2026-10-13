// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import {
  chunkTextNodes,
  DEFAULT_BATCH_SIZE,
  MAX_BATCH_CHARS,
} from '../src/content/batch-processor';

function makeNodes(texts: string[]): Text[] {
  return texts.map((text) => document.createTextNode(text));
}

describe('chunkTextNodes', () => {
  it('returns an empty list for no nodes', () => {
    expect(chunkTextNodes([])).toEqual([]);
  });

  it('splits nodes into batches of at most batchSize', () => {
    const nodes = makeNodes(Array.from({ length: 45 }, (_, i) => `text ${i}`));
    const batches = chunkTextNodes(nodes, 20, 10_000);
    expect(batches.map((batch) => batch.texts.length)).toEqual([20, 20, 5]);
  });

  it('starts a new batch when the character budget is exceeded', () => {
    const nodes = makeNodes(['a'.repeat(100), 'b'.repeat(100), 'c'.repeat(150)]);
    // budget 200 chars: [a(100)+b(100)] then c(150) alone
    const batches = chunkTextNodes(nodes, 20, 200);
    expect(batches.map((batch) => batch.texts.length)).toEqual([2, 1]);
  });

  it('puts one oversized node into its own batch rather than dropping it', () => {
    const nodes = makeNodes(['short', 'x'.repeat(500)]);
    const batches = chunkTextNodes(nodes, 20, 300);
    expect(batches.map((batch) => batch.texts.length)).toEqual([1, 1]);
    expect(batches[1]?.texts[0]).toBe('x'.repeat(500));
  });

  it('keeps node references aligned with texts for 1:1 injection (ADR-002)', () => {
    const nodes = makeNodes(['aa', 'bb', 'cc']);
    const batches = chunkTextNodes(nodes, 2, 10_000);
    expect(batches[0]?.nodes).toEqual([nodes[0], nodes[1]]);
    expect(batches[0]?.nodes[0]).toBe(nodes[0]); // same reference, not a clone
    expect(batches[0]?.texts).toEqual(['aa', 'bb']);
    expect(batches[1]?.nodes).toEqual([nodes[2]]);
  });

  it('uses sensible defaults', () => {
    expect(DEFAULT_BATCH_SIZE).toBe(20);
    expect(MAX_BATCH_CHARS).toBeGreaterThan(0);
  });
});
