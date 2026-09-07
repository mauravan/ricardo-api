import { RicardoValidationError } from "./core/errors";
import { HttpClient } from "./core/http";
import { TokenBucket } from "./core/rate-limit";
import { CategoriesResource } from "./resources/categories";
import { ListingsResource } from "./resources/listings";
import { SuggestionsResource } from "./resources/suggestions";

import { SearchBuilder } from "./search/builder";
import { Session, type SessionOptions } from "./session/session";

export type RawFetch = typeof fetch;

export interface RicardoClientOptions extends SessionOptions {
  /** Default: https://api.ricardo.ch (verified mobile) */
  baseURL?: string;
  /** Default: m (verified mobile) */
  apiVersion?: string;
  /** Inject a custom fetch (proxy, mocking). Default: global fetch. */
  fetch?: RawFetch;
  /** Provide a pre-built Session instead of the *Options fields. */
  session?: Session;
  /**
   * Client-level rate limiter. Token-bucket algorithm; requests beyond the
   * sustained throughput wait transparently until a token is free.
   * Default: `{ tokensPerSecond: 5, burst: 10 }`. Pass `false` to disable.
   */
  rateLimit?:
    | false
    | {
        tokensPerSecond?: number;
        burst?: number;
      };
}

/**
 * Entry point. One instance = one anonymous client. Pass your own `Session`
 * to customise the device hash, app identity headers, and language.
 */
export class RicardoClient {
  readonly session: Session;
  readonly http: HttpClient;
  readonly listings: ListingsResource;
  readonly categories: CategoriesResource;
  readonly suggestions: SuggestionsResource;
  readonly limiter?: TokenBucket;

  constructor(options: RicardoClientOptions = {}) {
    const fetchImpl =
      options.fetch ?? (globalThis.fetch as RawFetch | undefined);
    if (!fetchImpl) {
      throw new Error(
        "No fetch available. Use Node 18+, a browser, or pass options.fetch.",
      );
    }

    this.session =
      options.session ??
      new Session({
        ricardoHash: options.ricardoHash,
        app: options.app,
        language: options.language,
      });

    const rl = options.rateLimit;
    if (rl !== false) {
      const tokensPerSecond = rl?.tokensPerSecond ?? 5;
      const burst = rl?.burst ?? 10;
      if (!Number.isFinite(tokensPerSecond) || tokensPerSecond <= 0) {
        throw new RicardoValidationError(
          `rateLimit.tokensPerSecond must be a finite number > 0 (got ${tokensPerSecond})`,
        );
      }
      if (!Number.isFinite(burst) || !Number.isInteger(burst) || burst < 1) {
        throw new RicardoValidationError(
          `rateLimit.burst must be a finite integer >= 1 (got ${burst})`,
        );
      }
      this.limiter = new TokenBucket({ tokensPerSecond, burst });
    }

    this.http = new HttpClient({
      baseURL: options.baseURL ?? "https://api.ricardo.ch",
      apiVersion: options.apiVersion ?? "m",
      session: this.session,
      fetch: fetchImpl,
      limiter: this.limiter,
    });

    this.listings = new ListingsResource(this.http);
    this.categories = new CategoriesResource(this.http);
    this.suggestions = new SuggestionsResource(this.http);
  }

  /** Keyword/category/filter search. `search('sofa').category('furniture')...` */
  search(query?: string): SearchBuilder {
    return new SearchBuilder(this.http, "query", query);
  }

  /** Browse a category by its opaque search token (from a prior result). */
  browse(token: string): SearchBuilder {
    return new SearchBuilder(this.http, "token", token);
  }
}
