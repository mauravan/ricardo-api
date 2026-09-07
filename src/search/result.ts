import type {
  Listing,
  ListingImage,
  ListingSearchResult,
  SellerInfo,
} from "../core/types";
import type { SearchBuilder } from "./builder";

/** One page of search results, plus helpers to paginate and to discover the
 *  filters available for the current query/category. */
export class SearchResult {
  constructor(
    private readonly builder: SearchBuilder,
    private readonly root: ListingSearchResult,
  ) {}

  /** Total matching listings server-side (across all pages). */
  get totalCount(): number {
    return (
      (this.root as unknown as { total_count?: number }).total_count ??
      (this.root as unknown as { totalCount?: number }).totalCount ??
      (this.root as unknown as { totalArticlesCount?: number })
        .totalArticlesCount ??
      this.root.listings?.totalCount ??
      0
    );
  }

  /** Listings on this page. */
  get listings(): Listing[] {
    // REST path: root.listings.edges (mapped) or raw articles mapped
    if (
      (this.root as unknown as { articles?: unknown[] }).articles &&
      !(this.root as unknown as { listings?: unknown }).listings
    ) {
      return (
        (this.root as unknown as { articles: unknown[] }).articles as Record<
          string,
          unknown
        >[]
      ).map((a) => ({
        ...(a as object),
        listingID: (a.id ?? a.article_id ?? "") as string,
        title: (a.title ?? "") as string,
        formattedPrice:
          (a.buynow_price as number | null) != null
            ? `CHF ${Math.round((a.buynow_price as number) / 100)}`
            : (a.buyNowPrice as number | null) != null
              ? `CHF ${a.buyNowPrice as number}`
              : (a.bid_price as number | null) != null
                ? `CHF ${Math.round((a.bid_price as number) / 100)}`
                : (a.bidPrice as number | null) != null
                  ? `CHF ${a.bidPrice as number}`
                  : undefined,
        sellerInfo: {
          publicAccountID: (a.seller_id ?? a.sellerId ?? "") as string,
        } as unknown as SellerInfo,
        images: (a.image_url as string | null)
          ? ([
              { rendition: { src: a.image_url as string } },
            ] as unknown as ListingImage[])
          : (a.image as string | null)
            ? ([
                { rendition: { src: a.image as string } },
              ] as unknown as ListingImage[])
            : [],
      })) as Listing[];
    }
    return (this.root.listings?.edges ?? []).map((e) => e.node);
  }

  /** Featured/hero listings returned alongside the result set. */
  get galleryListings(): Listing[] {
    return (this.root as any).galleryListings ?? [];
  }

  /** Filters available for this query/category (names, labels, options). */
  get availableFilters(): unknown[] {
    const f =
      (this.root as unknown as { filters?: unknown }).filters ??
      (this.root as unknown as { attributes?: unknown }).attributes;
    if (Array.isArray(f)) return f as unknown[];
    if (f && typeof f === "object")
      return Object.entries(f as Record<string, unknown>).map(([name, v]) => ({
        name,
        ...(v as object),
      }));
    return (f as unknown[]) ?? [];
  }

  /** Opaque token to browse this category via `client.browse(token)`. */
  get searchToken(): string | null {
    return (
      (this.root as unknown as { search_uid?: string }).search_uid ??
      (this.root as unknown as { searchUid?: string }).searchUid ??
      this.root.searchToken ??
      null
    );
  }

  get pageInfo(): { hasNextPage: boolean; endCursor: string | null } {
    const pi = (
      this.root as unknown as {
        listings?: {
          pageInfo?: { hasNextPage: boolean; endCursor: string | null };
        };
      }
    ).listings?.pageInfo;
    if (pi) return { hasNextPage: pi.hasNextPage, endCursor: pi.endCursor };
    const cfg = (
      this.root as unknown as { config?: { nextOffset?: number | null } }
    ).config;
    if (cfg?.nextOffset != null)
      return { hasNextPage: true, endCursor: String(cfg.nextOffset) };
    const nextOffset =
      (this.root as unknown as { next_offset?: number | null }).next_offset ??
      (this.root as unknown as { nextOffset?: number | null }).nextOffset;
    if (nextOffset != null)
      return { hasNextPage: true, endCursor: String(nextOffset) };
    return { hasNextPage: false, endCursor: null };
  }

  get hasNextPage(): boolean {
    return this.pageInfo.hasNextPage;
  }

  /** Fetch the next page, or null if there is none. */
  async next(): Promise<SearchResult | null> {
    if (!this.hasNextPage) return null;
    return this.builder.cursor(this.pageInfo.endCursor).fetch();
  }

  /** Async-iterate every listing across all pages. */
  async *paginate(): AsyncGenerator<Listing> {
    let current: SearchResult | null = this;
    while (current) {
      for (const l of current.listings) yield l;
      current = await current.next();
      // Safety: prevent infinite loop if API keeps returning same nextOffset
      if (current && current.pageInfo.endCursor === this.pageInfo.endCursor)
        break;
    }
  }

  /** The raw, unmodeled response root (escape hatch). */
  raw(): ListingSearchResult {
    return (this.root as any)._raw ?? this.root;
  }
}
