import { RicardoValidationError } from "../core/errors";
import type { HttpClient } from "../core/http";
import type {
  Filter,
  IntervalConstraint,
  Listing,
  ListingImage,
  ListingSearchResult,
  Locality,
  MobileArticle,
  MobileSearchRequest,
  MobileSearchResponse,
  PriceConstraint,
  SellerInfo,
  SortDirection,
  SortField,
  StringConstraint,
} from "../core/types";
import { SearchResult } from "./result";

export type SearchMode = "query" | "token";

/** Chainable search query builder. Each call mutates the draft and returns
 *  `this`; `.fetch()` runs the search and returns a {@link SearchResult}. */
export class SearchBuilder {
  private _query?: string;
  private _token?: string;
  private _categoryId?: string;
  private _cursor: string | null = null; // offset as string
  private _sort: SortField = "timestamp";
  private _direction: SortDirection = "desc";
  private _imageHeight = 630;
  private _radius?: number;

  private _prices: PriceConstraint[] = [];
  private _localities: Locality[] = [];
  private _intervals: IntervalConstraint[] = [];
  private _strings: StringConstraint[] = [];
  constructor(
    private readonly http: HttpClient,
    private readonly mode: SearchMode,
    seed?: string,
  ) {
    if (mode === "query") this._query = seed;
    else this._token = seed;
  }

  /** Restrict to a category id (e.g. "40748"). Verified via search response `categories[]` but server currently ignores `category` param — kept for compat, not yet mapped to REST `category` filter. */
  category(id: string): this {
    this._categoryId = id;
    return this;
  }

  /** Price bounds in CHF. Omit min or max for open-ended. Validates min <= max. */
  price(p: { min?: number; max?: number; freeOnly?: boolean }): this {
    if (p.min != null && p.max != null && p.min > p.max) {
      throw new RicardoValidationError(
        `price.min (${p.min}) > price.max (${p.max})`,
      );
    }
    this._prices = [{ key: "price", freeOnly: false, ...p }];
    return this;
  }

  /** Only free items. */
  freeOnly(): this {
    this._prices = [{ key: "price", freeOnly: true }];
    return this;
  }

  /** Add a locality (from `client.localities.search()`). Repeatable. */
  location(locality: Locality): this {
    this._localities.push(locality);
    return this;
  }

  /** Search radius around the selected localities (as the app sends it, in km). */
  radius(km: number): this {
    this._radius = km;
    return this;
  }

  /** Numeric range filter (e.g. "year", "mileage"). */
  interval(name: string, range: { min?: number; max?: number }): this {
    if (range.min != null && range.max != null && range.min > range.max) {
      throw new RicardoValidationError(`interval ${name}: min > max`);
    }
    this._intervals.push({ key: name, ...range });
    return this;
  }

  /** Single-select filter (e.g. select("companyAd", "private")). */
  select(name: string, value: string): this {
    this._strings.push({ key: name, values: [value] });
    return this;
  }

  /** Multi-select filter (e.g. multiSelect("language", ["de", "fr"])). */
  multiSelect(name: string, values: string[]): this {
    this._strings.push({ key: name, values });
    return this;
  }

  /** Sort field + direction (default: timestamp desc — newest first). */
  sort(field: SortField, direction: SortDirection = "desc"): this {
    void field;
    this._direction = direction;
    // Ricardo REST sort not yet verified; stored but not sent. If API exposes `sort` param, map here.
    return this;
  }

  /** Thumbnail height requested from the API. */
  imageHeight(px: number): this {
    this._imageHeight = px;
    return this;
  }

  /** Set the pagination cursor (offset as string, used internally by SearchResult.next()). */
  cursor(c: string | null): this {
    this._cursor = c;
    return this;
  }

  buildMobileBody(): MobileSearchRequest {
    // Mark unused but keep for compat
    void this._sort;
    void this._imageHeight;
    void this._radius;
    void this._intervals;
    void this._prices;
    void this._localities;
    const search_sentence =
      this.mode === "token" ? (this._token ?? "") : (this._query ?? "");
    const offset = parseInt(this._cursor ?? "0", 10) || 0;
    const limit = 40;
    // sorting_type unverified: 0 in HAR, guess 1 for asc
    const sorting_type = this._direction === "asc" ? 1 : 0;
    const offer_types = this._strings
      .filter((s) => s.key === "offerType")
      .flatMap((s) => s.values);
    const shippings = this._strings
      .filter((s) => s.key === "shipping" || s.key === "shippings")
      .flatMap((s) => s.values);
    const member_classes = this._strings
      .filter(
        (s) =>
          s.key === "memberClass" ||
          s.key === "member_classes" ||
          s.key === "sellerType",
      )
      .flatMap((s) => s.values);
    const body: MobileSearchRequest = {
      search_sentence,
      offset,
      limit,
      sorting_type,
      offer_types,
      shippings,
      member_classes,
      use_attribute_facets: true,
      promo_offer: true,
    };
    if (this._categoryId) body.category_nr = this._categoryId;
    return body;
  }

  private buildQuery(): Record<string, string | number | undefined> {
    const b = this.buildMobileBody();
    return {
      searchTerm: b.search_sentence,
      size: b.limit,
      offset: b.offset,
      apiToken: "",
      category: b.category_nr || undefined,
    };
  }

  /** Execute the search and return the first page of results. */
  async fetch(): Promise<SearchResult> {
    const body = this.buildMobileBody();
    const data = (await this.http.request("POST", "/search", {
      body,
      headers: { "r-api-version": "2025-04-16" },
    })) as MobileSearchResponse & Record<string, unknown>;

    // Normalize MobileSearchResponse to ListingSearchResult for SearchResult compatibility
    const articles = (data as MobileSearchResponse).articles ?? [];
    const total_count = (data as MobileSearchResponse).total_count ?? 0;
    const next_offset = (data as MobileSearchResponse).next_offset;
    const search_uid = (data as MobileSearchResponse).search_uid;
    const attributes = (data as MobileSearchResponse).attributes;

    const offset = body.offset;
    const limit = body.limit;

    const normalized: ListingSearchResult = {
      ...data,
      listings: {
        totalCount: total_count,
        edges: (articles as MobileArticle[]).map((a) => ({
          node: {
            ...a,
            listingID: a.id,
            title: a.title,
            formattedPrice:
              a.buynow_price != null
                ? `CHF ${Math.round(a.buynow_price / 100)}`
                : a.bid_price != null
                  ? `CHF ${Math.round(a.bid_price / 100)}`
                  : undefined,
            sellerInfo: {
              publicAccountID: a.seller_id,
            } as unknown as SellerInfo,
            images: a.image_url
              ? ([
                  { rendition: { src: a.image_url } },
                ] as unknown as ListingImage[])
              : [],
            timestamp: a.creation_date,
            id: a.id,
            buyNowPrice: a.buynow_price,
            bidPrice: a.bid_price,
          } as unknown as Listing,
        })),
        pageInfo: {
          hasNextPage:
            next_offset != null
              ? (articles as unknown[]).length > 0 && next_offset !== offset
              : offset + (articles as unknown[]).length < total_count,
          endCursor:
            next_offset != null
              ? String(next_offset + 1)
              : String(offset + limit),
        },
      },
      filters: attributes as unknown as Filter[],
      searchToken: (search_uid as string) ?? null,
      query: this._query ?? null,
    } as unknown as ListingSearchResult;

    // Ensure raw access and compat fields for SearchResult getters
    (normalized as Record<string, unknown>)._raw = data;
    (normalized as Record<string, unknown>).articles = articles;
    (normalized as Record<string, unknown>).total_count = total_count;
    (normalized as Record<string, unknown>).totalCount = total_count;
    (normalized as Record<string, unknown>).totalArticlesCount = total_count;
    (normalized as Record<string, unknown>).search_uid = search_uid;
    (normalized as Record<string, unknown>).searchUid = search_uid;
    (normalized as Record<string, unknown>).next_offset =
      next_offset != null ? next_offset + 1 : null;
    (normalized as Record<string, unknown>).config = {
      nextOffset: next_offset != null ? next_offset + 1 : null,
      pageSize: limit,
      currentPage: Math.floor(offset / limit),
    };
    (normalized as Record<string, unknown>).attributes = attributes;

    return new SearchResult(this, normalized);
  }

  /**
   * Fetch the available filters + result count for the current
   * category/query/constraints WITHOUT fetching a listings page
   * (UpdateFilters). Use `.availableFilters` / `.totalCount` on the result.
   */
  async updateFilters(): Promise<ListingSearchResult> {
    return this.fetch().then((r) => r.raw() as ListingSearchResult);
  }
}
