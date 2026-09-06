import type { HttpClient } from "../core/http";
import type {
  Listing,
  MobileArticleDetail,
  RicardoArticle,
} from "../core/types";

/** Listing reads via mobile `GET /m/listings/{id}`. */
export class ListingsResource {
  constructor(private readonly http: HttpClient) {}

  /** Full detail for a single listing by id via `GET /m/listings/{id}` (verified mobile). */
  async get(
    listingId: string,
  ): Promise<MobileArticleDetail & RicardoArticle & Listing> {
    const data = (await this.http.request("GET", `/listings/${listingId}`, {
      query: {
        is_mg_auction_optional: true,
        is_mg_fixed_price_optional: true,
        is_mg_price_offer_optional: true,
      },
      headers: { "r-api-version": "2026-02-24" },
    })) as MobileArticleDetail & Record<string, unknown>;

    // Map MobileArticleDetail to RicardoArticle & Listing for compat
    const mapped = {
      ...(data as object),
      // mobile article_id -> listingID/id
      id:
        (data as MobileArticleDetail).article_id ??
        (data as unknown as { id?: string }).id ??
        listingId,
      listingID:
        (data as MobileArticleDetail).article_id ??
        (data as unknown as { id?: string }).id ??
        listingId,
      title: (data as MobileArticleDetail).title ?? "",
      buyNowPrice: (data as MobileArticleDetail).buy_now_price ?? null,
      bidPrice: (data as MobileArticleDetail).bid_price ?? null,
      // preserve raw for escape hatch
      article_id: (data as MobileArticleDetail).article_id,
      buy_now_price: (data as MobileArticleDetail).buy_now_price,
    } as unknown as MobileArticleDetail & RicardoArticle & Listing;

    return mapped;
  }

  /** Similar listings via `GET /m/listings/{id}/similar?count=20` (verified). */
  async similar(
    listingId: string,
    count = 20,
  ): Promise<{ recommended_articles: unknown[] } & Record<string, unknown>> {
    const data = (await this.http.request(
      "GET",
      `/listings/${listingId}/similar`,
      {
        query: { count },
        headers: { "r-api-version": "2025-04-15" },
      },
    )) as { recommended_articles: unknown[] } & Record<string, unknown>;
    return data;
  }
}
