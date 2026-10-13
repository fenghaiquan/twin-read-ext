/**
 * Page translation controller (Sprint 4.1, ADR-004).
 *
 * Manages full-page translation with:
 * - IntersectionObserver-based lazy translation (viewport-driven)
 * - In-memory cache for instant toggle off→on
 * - Pending markers + finalization flow
 * - Run-token validation to drop stale responses
 */

import type { TranslationRequest, TranslationResponse } from '@shared/types';
import { extractBlockTargets, type BlockTarget } from './dom-parser';
import { chunkBlocks } from './batch-processor';
import {
  insertPendingAfter,
  insertTranslationAfter,
  finalizePending,
  markFailed,
  removeAllTranslations,
} from './inject';

export const PRELOAD_MARGIN_PX = 600;
export const FLUSH_DEBOUNCE_MS = 200;

interface ControllerDeps {
  sendMessage: (message: { type: 'translate'; request: TranslationRequest }) => Promise<TranslationResponse | undefined>;
  root: Document | Element;
}

/** In-memory cache for translations (cleared on page reload). */
class TranslationCache {
  private cache = new Map<string, string>();

  get(text: string): string | undefined {
    return this.cache.get(text);
  }

  set(text: string, translated: string): void {
    this.cache.set(text, translated);
  }

  clear(): void {
    this.cache.clear();
  }

  has(text: string): boolean {
    return this.cache.has(text);
  }
}

export class PageTranslationController {
  private enabled = false;
  private runToken = 0;
  private observer: IntersectionObserver;
  private cache = new TranslationCache();
  private pendingBlocks: BlockTarget[] = [];
  private pendingSpans = new Map<Element, HTMLSpanElement>();
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private allBlocks: BlockTarget[] = [];

  constructor(private deps: ControllerDeps) {
    this.observer = new IntersectionObserver(this.handleIntersection.bind(this), {
      rootMargin: `0px 0px ${PRELOAD_MARGIN_PX}px 0px`,
    });
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async toggle(): Promise<{ enabled: boolean }> {
    this.enabled = !this.enabled;
    this.runToken += 1;

    if (!this.enabled) {
      this.shutdown();
      return { enabled: false };
    }

    void this.startTranslation();
    return { enabled: true };
  }

  private shutdown(): void {
    this.observer.disconnect();
    this.pendingBlocks = [];
    this.pendingSpans.clear();
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    this.allBlocks = [];
    removeAllTranslations(this.deps.root);
  }

  private async startTranslation(): Promise<void> {
    this.allBlocks = extractBlockTargets(this.deps.root);
    
    for (const block of this.allBlocks) {
      // Check cache first
      const cached = this.cache.get(block.text);
      if (cached) {
        insertTranslationAfter(block.element, cached);
        continue;
      }

      // Observe for lazy translation
      this.observer.observe(block.element);
    }
  }

  private handleIntersection(entries: IntersectionObserverEntry[]): void {
    const token = this.runToken;
    
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      
      const element = entry.target as Element;
      this.observer.unobserve(element);
      
      const block = this.allBlocks.find((b) => b.element === element);
      if (!block) continue;

      // Insert pending marker
      const pending = insertPendingAfter(element);
      this.pendingSpans.set(element, pending);
      this.pendingBlocks.push(block);

      // Debounce flush
      this.scheduleFlush(token);
    }
  }

  private scheduleFlush(token: number): void {
    if (this.flushTimer !== null) return;
    this.flushTimer = setTimeout(() => {
      void this.flush(token);
      this.flushTimer = null;
    }, FLUSH_DEBOUNCE_MS);
  }

  private async flush(token: number): Promise<void> {
    if (this.pendingBlocks.length === 0) return;

    const blocks = [...this.pendingBlocks];
    this.pendingBlocks = [];

    const batches = chunkBlocks(blocks);

    for (const batch of batches) {
      if (token !== this.runToken) return; // toggled off
      
      const request: TranslationRequest = {
        id: crypto.randomUUID(),
        type: 'full-page',
        texts: batch.texts,
      };

      try {
        const response = await this.deps.sendMessage({ type: 'translate', request });
        if (token !== this.runToken) return; // toggled off during await

        if (!response?.success) {
          for (const anchor of batch.anchors) {
            const pending = this.pendingSpans.get(anchor);
            if (pending) {
              markFailed(pending);
              this.pendingSpans.delete(anchor);
            }
          }
          continue;
        }

        // Cache and finalize
        for (const [i, anchor] of batch.anchors.entries()) {
          const translated = response.translatedTexts[i] ?? '';
          const originalText = batch.texts[i];
          if (originalText !== undefined) {
            this.cache.set(originalText, translated);
          }
          const pending = this.pendingSpans.get(anchor);
          if (pending) {
            finalizePending(pending, translated);
            this.pendingSpans.delete(anchor);
          }
        }
      } catch (error) {
        console.warn('[twin-read] batch request failed:', error);
        for (const anchor of batch.anchors) {
          const pending = this.pendingSpans.get(anchor);
          if (pending) {
            markFailed(pending);
            this.pendingSpans.delete(anchor);
          }
        }
      }
    }
  }
}
