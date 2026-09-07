import type { HttpClient } from "../core/http";

/** Category taxonomy reads via mobile `GET /m/home`. */
export class CategoriesResource {
  constructor(private readonly http: HttpClient) {}

  /** The full category tree via `GET /m/home?with_stories=true` → `root_categories` (verified). */
  async tree(): Promise<unknown> {
    try {
      const data = (await this.http.request("GET", "/home", {
        query: { with_stories: true },
      })) as { root_categories?: unknown[] };
      if (Array.isArray(data.root_categories)) return data.root_categories;
    } catch {}
    // Fallback: try POST /m/search with empty query (categories from search is legacy)
    try {
      const data = (await this.http.request("POST", "/search", {
        body: {
          search_sentence: "",
          offset: 0,
          limit: 1,
          sorting_type: 0,
          offer_types: [],
          shippings: [],
          member_classes: [],
          use_attribute_facets: false,
          promo_offer: false,
        },
        headers: { "r-api-version": "2025-04-16" },
      })) as { categories?: unknown };
      return (data as unknown as { categories?: unknown }).categories ?? [];
    } catch {
      return [];
    }
  }

  /** Featured categories for the home screen (first 10 from tree). */
  async featured(_preferredImageSize = 200): Promise<unknown> {
    const tree = (await this.tree()) as unknown[];
    return Array.isArray(tree) ? tree.slice(0, 10) : tree;
  }
}
