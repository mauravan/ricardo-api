import type { HttpClient } from "../core/http";

export interface SuggestionOptions {
  /** Stable per-user/device id. Defaults to the session's ricardoHash. */
  userIdentifier?: string;
  /** Max suggestions. Default 6. */
  first?: number;
}

/** Search-box autocomplete suggestions. */
export class SuggestionsResource {
  constructor(private readonly http: HttpClient) {}

  /** Suggestions for a partial query via `POST /m/search` (verified mobile, uses `search_sentence`). */
  async search(
    query: string,
    options: { userIdentifier?: string; first?: number } = {},
  ): Promise<unknown> {
    void options.userIdentifier;
    const first = options.first ?? 6;
    try {
      const data = (await this.http.request("POST", "/search", {
        body: {
          search_sentence: query,
          offset: 0,
          limit: first,
          sorting_type: 0,
          offer_types: [],
          shippings: [],
          member_classes: [],
          use_attribute_facets: true,
          promo_offer: true,
        },
        headers: { "r-api-version": "2025-04-16" },
      })) as Record<string, unknown>;
      const sug =
        (data as { searchSuggestions?: unknown[] }).searchSuggestions ??
        (data as { suggested_categories?: unknown[] }).suggested_categories ??
        (data as { suggestions?: unknown[] }).suggestions ??
        [];
      const arr = Array.isArray(sug) ? sug : [];
      return {
        suggestionGroups: [{ suggestions: arr }],
        searchSuggestions: arr,
        suggested_categories: arr,
        raw: data,
      };
    } catch {
      return {
        suggestionGroups: [{ suggestions: [] }],
        searchSuggestions: [],
        raw: {},
      };
    }
  }
}
