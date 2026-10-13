import { describe, expect, it } from 'vitest';
import { createConcurrencyLimiter, MAX_CONCURRENT_LLM_REQUESTS } from '../src/background/queue';

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Flush microtasks deterministically. */
function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('createConcurrencyLimiter', () => {
  it('defaults to a limit of 3 (guide requirement)', () => {
    expect(MAX_CONCURRENT_LLM_REQUESTS).toBe(3);
  });

  it('runs at most `limit` tasks at the same time', async () => {
    const limiter = createConcurrencyLimiter(2);
    const d1 = deferred<number>();
    const d2 = deferred<number>();
    const d3 = deferred<number>();

    let started = 0;
    const track = (d: Deferred<number>) => () => {
      started += 1;
      return d.promise;
    };

    const p1 = limiter.run(track(d1));
    const p2 = limiter.run(track(d2));
    const p3 = limiter.run(track(d3));
    await tick();

    expect(started).toBe(2); // third is queued

    d1.resolve(1);
    expect(await p1).toBe(1);
    await tick();
    expect(started).toBe(3); // slot freed, third starts

    d2.resolve(2);
    d3.resolve(3);
    expect(await Promise.all([p2, p3])).toEqual([2, 3]);
  });

  it('starts waiting tasks in FIFO order', async () => {
    const limiter = createConcurrencyLimiter(1);
    const order: number[] = [];
    const task = (n: number) => async () => {
      order.push(n);
      return n;
    };
    await Promise.all([
      limiter.run(task(1)),
      limiter.run(task(2)),
      limiter.run(task(3)),
    ]);
    expect(order).toEqual([1, 2, 3]);
  });

  it('frees the slot after a rejected task', async () => {
    const limiter = createConcurrencyLimiter(1);
    await expect(limiter.run(async () => Promise.reject(new Error('boom')))).rejects.toThrow(
      'boom',
    );
    await expect(limiter.run(async () => 'ok')).resolves.toBe('ok');
  });

  it('passes through the task value', async () => {
    const limiter = createConcurrencyLimiter(3);
    await expect(limiter.run(async () => 42)).resolves.toBe(42);
  });
});
