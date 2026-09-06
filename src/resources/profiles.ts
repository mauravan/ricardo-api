import type { HttpClient } from "../core/http";

export interface UserListingsOptions {
  direction?: "asc" | "desc";
  offset?: number;
  size?: number;
  imageHeight?: number;
}

/** Public seller profiles + their listings. Stubs pending capture. */
export class ProfilesResource {
  constructor(private readonly http: HttpClient) {}

  /** A seller's public account info — stub (no `/api/mfa/user/{id}` verified, 404). */
  async get(publicAccountID: string): Promise<unknown> {
    void this.http;
    // No verified endpoint; return minimal stub and document
    return {
      publicAccountID,
      note: "unverified — no ricardo profile JSON endpoint found (all /api/mfa/user/* 404). Capture via browser HAR required.",
    };
  }

  /** A seller's listings, paged by offset/size — stub via POST /m/search. */
  async listings(
    publicAccountID: string,
    options: {
      offset?: number;
      size?: number;
      direction?: string;
      imageHeight?: number;
    } = {},
  ): Promise<unknown> {
    void options.direction;
    void options.imageHeight;
    // Unverified — no /m/user/{id} endpoint in HAR; fallback via POST /m/search with search_sentence = seller id
    try {
      const data = (await this.http.request("POST", "/search", {
        body: {
          search_sentence: publicAccountID,
          offset: options.offset ?? 0,
          limit: options.size ?? 30,
          sorting_type: 0,
          offer_types: [],
          shippings: [],
          member_classes: [],
          use_attribute_facets: false,
          promo_offer: false,
        },
        headers: { "r-api-version": "2025-04-16" },
      })) as { articles?: unknown[]; total_count?: number };
      const articles = (data as { articles?: unknown[] }).articles ?? [];
      const total_count =
        (data as { total_count?: number }).total_count ?? articles.length;
      return {
        listings: {
          totalCount: total_count,
          edges: articles
            .slice(0, options.size ?? 30)
            .map((a) => ({ node: a })),
        },
        note: "unverified — seller listings via POST /m/search search_sentence fallback; verify via HAR",
      };
    } catch {
      return {
        listings: { totalCount: 0, edges: [] },
        note: "unverified — seller listings fallback failed",
      };
    }
  }
}
