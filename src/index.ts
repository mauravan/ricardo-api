/**
 * TypeScript client for ricardo.ch.
 *
 * Entry point: {@link RicardoClient}. Search via {@link SearchBuilder}, read
 * listings/categories/suggestions, customise the client identity through
 * {@link Session}.
 *
 * @packageDocumentation
 */
export { RicardoClient, type RicardoClientOptions } from "./client";
export {
  RicardoError,
  RicardoHttpError,
  RicardoNetworkError,
  RicardoRateLimitError,
  RicardoValidationError,
} from "./core/errors";
export {
  type FetchLike,
  type FetchResponse,
  HttpClient,
  type HttpClientOptions,
} from "./core/http";
export { TokenBucket, type TokenBucketOptions } from "./core/rate-limit";
export * from "./core/types";
export { CategoriesResource } from "./resources/categories";
export { ListingsResource } from "./resources/listings";
export {
  type SuggestionOptions,
  SuggestionsResource,
} from "./resources/suggestions";
export { SearchBuilder, type SearchMode } from "./search/builder";
export { SearchResult } from "./search/result";
export {
  type AppConfig,
  Session,
  type SessionOptions,
} from "./session/session";
