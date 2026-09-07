import { RicardoRateLimitError } from "./errors";

export interface TokenBucketOptions {
  /** Sustained refill rate (tokens per second). Must be > 0. Default 5. */
  tokensPerSecond: number;
  /** Maximum tokens that can accumulate. Must be >= 1. Default 10. */
  burst: number;
  /** Inject for tests. Default `() => performance.now()`. */
  now?: () => number;
}

interface Waiter {
  resolve: () => void;
  reject: (err: unknown) => void;
  timer: ReturnType<typeof setTimeout> | undefined;
  signal: AbortSignal | undefined;
  onAbort: (() => void) | undefined;
}

/**
 * Token-bucket rate limiter. Lazy refill: `tokens` and `lastRefill` are
 * advanced only when `acquire()` runs, so an idle bucket costs nothing.
 *
 * Each `acquire()` either resolves immediately (token taken) or schedules a
 * single `setTimeout` for the exact wait time. On fire it refills, takes the
 * token, and resolves; otherwise re-schedules. No busy loop.
 *
 * `dispose()` clears the timer and rejects every pending acquirer with
 * {@link RicardoRateLimitError} so callers cannot hang on shutdown.
 */
export class TokenBucket {
  private readonly rps: number;
  private readonly burst: number;
  private readonly now: () => number;
  private tokens: number;
  private lastRefill: number;
  private disposed = false;
  private readonly waiters: Waiter[] = [];

  constructor(opts: TokenBucketOptions) {
    this.rps = opts.tokensPerSecond;
    this.burst = opts.burst;
    this.now = opts.now ?? (() => performance.now());
    this.tokens = opts.burst;
    this.lastRefill = this.now();
  }

  /** Resolves once a token is available. Cancellable via `signal`. */
  acquire(signal?: AbortSignal): Promise<void> {
    if (this.disposed) {
      return Promise.reject(new RicardoRateLimitError(0));
    }
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      const waiter: Waiter = {
        resolve,
        reject,
        timer: undefined,
        signal,
        onAbort: undefined,
      };

      const fail = (err: unknown) => {
        if (waiter.timer !== undefined) {
          clearTimeout(waiter.timer);
          waiter.timer = undefined;
        }
        if (waiter.onAbort && waiter.signal) {
          waiter.signal.removeEventListener("abort", waiter.onAbort);
        }
        const idx = this.waiters.indexOf(waiter);
        if (idx >= 0) this.waiters.splice(idx, 1);
        reject(err);
      };

      const onAbort = () => {
        fail(
          waiter.signal?.reason ?? new DOMException("Aborted", "AbortError"),
        );
      };

      if (signal) {
        if (signal.aborted) {
          fail(signal.reason ?? new DOMException("Aborted", "AbortError"));
          return;
        }
        waiter.onAbort = onAbort;
        signal.addEventListener("abort", onAbort, { once: true });
      }

      const tryGrant = () => {
        if (this.disposed) {
          fail(new RicardoRateLimitError(0));
          return;
        }
        this.refill();
        if (this.tokens >= 1) {
          this.tokens -= 1;
          const idx = this.waiters.indexOf(waiter);
          if (idx >= 0) this.waiters.splice(idx, 1);
          if (waiter.onAbort && waiter.signal) {
            waiter.signal.removeEventListener("abort", waiter.onAbort);
          }
          waiter.timer = undefined;
          resolve();
          return;
        }
        waiter.timer = setTimeout(tryGrant, this.computeWaitMs());
      };

      waiter.timer = setTimeout(tryGrant, this.computeWaitMs());
      this.waiters.push(waiter);
    });
  }

  /** Tokens currently available (may be fractional). */
  available(): number {
    this.refill();
    return this.tokens;
  }

  /** Stop the timer and reject every pending acquirer. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const w of this.waiters.slice()) {
      if (w.timer !== undefined) {
        clearTimeout(w.timer);
        w.timer = undefined;
      }
      if (w.onAbort && w.signal) {
        w.signal.removeEventListener("abort", w.onAbort);
      }
      w.reject(new RicardoRateLimitError(0));
    }
    this.waiters.length = 0;
  }

  private computeWaitMs(): number {
    return Math.max(1, Math.ceil(((1 - this.tokens) * 1000) / this.rps));
  }

  private refill(): void {
    const now = this.now();
    const elapsedSec = (now - this.lastRefill) / 1000;
    if (elapsedSec > 0) {
      this.tokens = Math.min(this.burst, this.tokens + elapsedSec * this.rps);
      this.lastRefill = now;
    }
  }
}
