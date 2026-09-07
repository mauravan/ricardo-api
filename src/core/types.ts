// Types modeled from captured ricardo.ch API responses. Fields seen rarely or
// nullable in captures are typed optional. The library never strips unknown
// fields — use `.raw()` to reach anything not modeled here.

// ---- Public, friendly sort options (mapped to GraphQL enums internally) ----
export type SortField = "timestamp";
export type SortDirection = "asc" | "desc";

// ---- GraphQL enum wire values ----
export type GqlSortMode = "TIMESTAMP";
export type GqlSortDirection = "ASCENDING" | "DESCENDING";

// ---- Locality (from SearchLocalities; also used inside location constraints) ----
export interface Locality {
  localityID: string;
  name: string;
  localityType?: string;
}

// ---- Search filter constraints (GraphQL input: ListingSearchConstraints) ----
// NOTE: element shapes verified against the app's Apollo input adapters
// (ConstraintsMapperKt / ListingLocationConstraint_InputAdapter).
export interface PriceConstraint {
  key: "price";
  // Required non-null Boolean on the wire (ListingPriceConstraint.freeOnly: Z,
  // checkNotNull in the Kotlin input type). Must always be sent — omitting it
  // makes the server reject the whole request with GRAPHQL_VALIDATION_FAILED.
  freeOnly: boolean;
  min?: number;
  max?: number;
}
// ListingLocationConstraint: `localities` is a list of LocalityID strings
// (NOT full Locality objects), with an optional radius.
export interface LocationConstraint {
  key: "location";
  localities: string[];
  radius?: number;
}
export interface IntervalConstraint {
  key: string;
  min?: number;
  max?: number;
}
export interface StringConstraint {
  key: string;
  values: string[];
}
export interface Constraints {
  intervals: IntervalConstraint[];
  locations: LocationConstraint[];
  prices: PriceConstraint[];
  strings: StringConstraint[];
}

// ---- Listing model ----
export interface ImageRendition {
  src: string;
}
export interface ListingImage {
  rendition?: ImageRendition;
}
export interface Canton {
  name?: string;
  shortName?: string;
  circularIcon?: ImageRendition;
}
export interface PostcodeInformation {
  canton?: Canton;
  locationName?: string;
  postcode?: string;
}
export interface SellerInfo {
  publicAccountID?: string;
  alias?: string;
  logo?: ImageRendition | null;
  subscriptionInfo?: unknown;
}
export interface CategoryRef {
  categoryID: string;
  label: string;
}

// ---- Ricardo REST article model (verified via GET /api/mfa/search) ----
export interface RicardoArticle {
  id: string;
  title: string;
  endDate: string;
  categoryId: number;
  conditionKey: string;
  image: string | null;
  isPromo: boolean;
  hasBuyNow: boolean;
  bidsCount: number;
  hasAuction: boolean;
  bidPrice: number | null;
  buyNowPrice: number | null;
  sellerId: string;
  shipping: Array<{ key: string; cost: number; zipCode: string; city: string }>;
  productTypeKey?: string;
  startDate?: string;
  creationDate?: string;
  promoOption?: string;
  isMoneyGuard?: boolean;
  canMakeAnOffer?: boolean;
  highlight?: string;
  [key: string]: unknown;
}

// Verified REST search response shape
export interface RicardoSearchResponse {
  seoMetadata?: unknown;
  categories?: Array<{ id: number; name: string; slug: string; count: number }>;
  articles: RicardoArticle[];
  totalArticlesCount: number;
  config: {
    pageSize: number;
    currentPage: number;
    nextOffset: number | null;
    backendPageLimit?: number;
  };
  filters: Record<string, unknown>;
  categoryCounts?: unknown;
  searchSuggestions?: Array<{
    type: string;
    name: string;
    categorySlugAndId: string;
  }>;
  searchUid?: string;
  [key: string]: unknown;
}

// ---- Mobile REST model (verified via POST /m/search, GET /m/listings/{id}) ----
export interface MobileSearchRequest {
  search_sentence: string;
  offset: number;
  limit: number;
  category_nr?: string;
  sorting_type?: number;
  offer_types?: string[];
  shippings?: string[];
  member_classes?: string[];
  use_attribute_facets?: boolean;
  promo_offer?: boolean;
}

export interface MobileArticle {
  id: string;
  title: string;
  category_id: string;
  image_url: string | null;
  buynow_price: number | null;
  bid_price: number | null;
  bids_count: number;
  offer_type: string;
  condition: string;
  seller_id: string;
  seller_nickname?: string;
  zip_code?: string;
  city?: string;
  creation_date?: string;
  end_date?: string;
  has_boost?: boolean;
  money_guard_enabled?: boolean;
  delivery_options?: Array<{ id: string; price: number }>;
  main_attribute_values?: Record<string, string>;
  highlight?: { type: string; value: string };
  ProductTypeKey?: string;
  on_wishlist?: boolean;
  [key: string]: unknown;
}

export interface MobileSearchResponse {
  search_uid: string;
  total_count: number;
  price_facet: { min: string; max: string };
  attributes: Array<{
    key: string;
    name: string;
    data_type?: string;
    is_group?: boolean;
    values: Array<{
      id: string;
      name: string;
      count: number;
      is_other?: boolean;
    }>;
  }>;
  articles: MobileArticle[];
  next_offset: number;
  suggested_categories?: unknown;
  searchSuggestions?: unknown;
  features?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface MobileArticleDetail {
  article_id: string;
  title: string;
  buy_now_price?: string | number | null;
  bid_price?: string | number | null;
  bids_count?: number;
  offer_type?: string;
  item_condition?: string;
  language?: string;
  categories?: Array<{
    category_id?: string;
    category_name?: string;
    [k: string]: unknown;
  }>;
  images?: Array<{ transformations: Array<{ name: string; url: string }> }>;
  seller?: { id?: string; nickname?: string; [k: string]: unknown };
  description?: string;
  availability_id?: string;
  available_quantity?: number;
  end_date?: string;
  start_date?: string;
  state?: string;
  status?: string;
  shipping_options?: unknown;
  fixed_price_delivery_options?: unknown;
  price_offer_delivery_options?: unknown;
  [key: string]: unknown;
}

// Alias for compat: Listing can be either GraphQL Listing or RicardoArticle
// We extend Listing to include Ricardo fields for convenience
export interface Listing {
  __typename?: string;
  listingID: string;
  title: string;
  address?: string | null;
  formattedPrice?: string;
  primaryCategory?: CategoryRef;
  images?: ListingImage[];
  timestamp?: string;
  postcodeInformation?: PostcodeInformation;
  highlighted?: boolean;
  thumbnail?: ListingImage;
  sellerInfo?: SellerInfo;
  formattedSource?: string | null;
  // Ricardo compat
  id?: string;
  buyNowPrice?: number | null;
  bidPrice?: number | null;
  categoryId?: number;
  conditionKey?: string;
  image?: string | null;
  sellerId?: string;
  shipping?: unknown;
  [key: string]: unknown;
}

// ---- Filters returned by the search response (discovery). Permissive on
// purpose: the exact selected fields depend on the captured query document. ----
export interface Filter {
  __typename: string;
  name: string;
  label: string;
  [key: string]: unknown;
}

// ---- Connection / response envelope ----
export interface PageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}
export interface ListingConnection {
  totalCount?: number;
  edges?: Array<{ node: Listing }>;
  pageInfo?: PageInfo;
  placements?: unknown[];
}
export interface ListingSearchResult {
  __typename?: string;
  selectedCategory?: CategoryRef | null;
  suggestedCategories?: CategoryRef[];
  filters?: Filter[] | Record<string, unknown>;
  galleryListings?: Listing[];
  listings?: ListingConnection;
  searchToken?: string | null;
  query?: string | null;
  // Ricardo REST fields (when using REST)
  articles?: RicardoArticle[];
  totalArticlesCount?: number;
  config?: { pageSize: number; nextOffset: number | null };
  categories?: Array<{ id: number; name: string; slug: string; count: number }>;
  searchSuggestions?: unknown[];
}
