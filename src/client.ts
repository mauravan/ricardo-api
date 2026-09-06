import { DEFAULT_OAUTH, type OAuthConfig, type RawFetch } from "./auth/login";
import { HttpClient } from "./core/http";
import { AccountResource } from "./resources/account";
import { CategoriesResource } from "./resources/categories";
import { ListingsResource } from "./resources/listings";
import { SuggestionsResource } from "./resources/suggestions";

import { SearchBuilder } from "./search/builder";
import { Session, type SessionOptions } from "./session/session";

export interface RicardoClientOptions extends SessionOptions {
  /** Default: https://api.ricardo.ch (verified mobile) */
  baseURL?: string;
  /** Default: m (verified mobile) */
  apiVersion?: string;
  /** Inject a custom fetch (proxy, mocking). Default: global fetch. */
  fetch?: RawFetch;
  /** Override Auth0/OAuth parameters (client id, hosts, scope, …). */
  oauth?: Partial<OAuthConfig>;
  /** Provide a pre-built/restored session instead of the *Options fields. */
  session?: Session;
}

/**
 * Entry point. One instance = one session/account. Compose more accounts by
 * constructing more clients (optionally from `Session.fromJSON`).
 */
export class RicardoClient {
  readonly session: Session;
  readonly http: HttpClient;
  readonly listings: ListingsResource;
  readonly account: AccountResource;
  readonly categories: CategoriesResource;
  readonly suggestions: SuggestionsResource;

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
        auth: options.auth,
      });

    this.http = new HttpClient({
      baseURL: options.baseURL ?? "https://api.ricardo.ch",
      apiVersion: options.apiVersion ?? "m",
      session: this.session,
      fetch: fetchImpl,
    });

    const oauth: OAuthConfig = { ...DEFAULT_OAUTH, ...options.oauth };
    this.listings = new ListingsResource(this.http);
    this.account = new AccountResource(
      this.http,
      this.session,
      fetchImpl,
      oauth,
    );
    this.categories = new CategoriesResource(this.http);
    this.suggestions = new SuggestionsResource(this.http, this.session);
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
