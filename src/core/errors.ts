export class RicardoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Non-2xx HTTP response. */
export class RicardoHttpError extends RicardoError {
  constructor(
    readonly status: number,
    readonly statusText: string,
    readonly body: string,
  ) {
    super(`HTTP ${status} ${statusText}: ${body.slice(0, 500)}`);
  }
}

/** Underlying fetch/transport threw (DNS, connection, etc.). */
export class RicardoNetworkError extends RicardoError {
  constructor(readonly cause: unknown) {
    super(
      `Network request failed: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
  }
}

/** Invalid arguments supplied to the builder (thrown synchronously). */
export class RicardoValidationError extends RicardoError {}
/** Thrown when the rate limiter is disposed while callers are waiting, or
 * when a request is denied because the limiter has been shut down. */
export class RicardoRateLimitError extends RicardoError {
  constructor(readonly retryAfterMs: number) {
    super(`Rate limit exceeded; retry after ${retryAfterMs}ms`);
    this.name = "RicardoRateLimitError";
  }
}
