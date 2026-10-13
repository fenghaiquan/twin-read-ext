/**
 * LLM request concurrency control (Sprint 4).
 *
 * The background service worker funnels every outbound 'translate' request
 * through a limiter so at most `limit` API calls are in flight at any time
 * (guide: max 3). Waiting tasks start in FIFO order.
 */

export const MAX_CONCURRENT_LLM_REQUESTS = 3;

export interface ConcurrencyLimiter {
  /** Run a task, queuing first if all slots are taken. */
  run<T>(task: () => Promise<T>): Promise<T>;
}

export function createConcurrencyLimiter(
  limit: number = MAX_CONCURRENT_LLM_REQUESTS,
): ConcurrencyLimiter {
  const waiting: Array<() => void> = [];
  let active = 0;

  async function run<T>(task: () => Promise<T>): Promise<T> {
    if (active >= limit) {
      await new Promise<void>((resolve) => waiting.push(resolve));
    }
    active += 1;
    try {
      return await task();
    } finally {
      active -= 1;
      waiting.shift()?.(); // wake the oldest waiter (FIFO)
    }
  }

  return { run };
}
