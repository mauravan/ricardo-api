# Endpoints — mobile verified 2026-09-05 (`docs/captures/mobile2.har`, `com.qxl.Client` 9.12.0)

Source: `docs/captures/mobile2.har` (mitmproxy, 31 entries). All `api.ricardo.ch/m/*` requests include AWS SigV4-ish `x-authorization` and `r-amz-date` headers (deviceId from `r-client-unique-id`). Verified on `android 14 sdk_gphone64_x86_64` with `User-Agent: MobileRicardo (sdk_gphone64_x86_64; android 14) ricardo.ch/9.12.0-91200 (release) deviceId/<uuid>`.

## Verified mobile endpoints

| Operation | Method | Path | Headers | Query / Body | Response |
|---|---|---|---|---|---|
| `m/search` | `POST` | `/m/search` | `r-api-version: 2025-04-16`, `r-client-unique-id: <uuid>`, `accept: application/json`, `accept-charset: UTF-8`, `accept-language: en`, `user-agent: MobileRicardo (...) deviceId/<uuid>`, `r-amz-date: YYYYMMDDTHHMMSSZ`, `x-authorization: AWS4-HMAC-SHA256 Credential=<uuid>/YYYYMMDD/aws4_request, SignedHeaders=accept-language;host;r-amz-date;r-api-version;r-client-unique-id;user-agent, Signature=<hex>` | Body `{"search_sentence":string,"offset":number,"limit":number,"category_nr":string,"sorting_type":number,"offer_types":string[],"shippings":string[],"member_classes":string[],"use_attribute_facets":boolean,"promo_offer":boolean}` — sample `{"search_sentence":"mini pc","offset":0,"limit":40,"category_nr":"39091","sorting_type":0,"offer_types":[],"shippings":[],"member_classes":[],"use_attribute_facets":true,"promo_offer":true}` | `200 {"search_uid":string,"total_count":number,"price_facet":{"min":string,"max":string},"features":{...},"attributes":[{"key":string,"name":string,"data_type":"multi","is_group":boolean,"values":[{"id":string,"name":string,"count":number,"is_other":boolean}]}],"articles":[{"id":string,"title":string,"category_id":string,"image_url":string,"buynow_price":number|null,"bid_price":number|null,"bids_count":number,"offer_type":string,"condition":string,"seller_id":string,"seller_nickname":string,"zip_code":string,"city":string,"delivery_options":[{"id":string,"price":number}],"main_attribute_values":{...},"has_boost":boolean,"creation_date":string,"end_date":string,"highlight":{type,value}, "ProductTypeKey":string}],"next_offset":number,"suggested_categories"?: ...}` — sample `search_sentence:"mini pc", category_nr:"39091", limit:40 → total_count:957, next_offset:39, first id 1327472806 title "Hp EliteDesk Mini-PC 800 G8 DM i7-11700,512,16gb,wifi" buynow_price 45000` |
| `m/listings get` | `GET` | `/m/listings/{id}` | `r-api-version: 2026-02-24`, `accept-language: en`, `user-agent: MobileRicardo (...)`, `r-amz-date`, `x-authorization` | Query `is_mg_auction_optional=true&is_mg_fixed_price_optional=true&is_mg_price_offer_optional=true` — sample `GET /m/listings/1327472806?is_mg_auction_optional=true&is_mg_fixed_price_optional=true&is_mg_price_offer_optional=true` (entry ~26) | `200 {article_id:string,title:string,buy_now_price:number,buy_now_price? display, bid_price?, bids_count, offer_type, item_condition, language, categories:[...], images:[{transformations:[{name:string,url:string}]}], seller:{id,nickname,...}, description, availability_id, available_quantity, end_date, start_date, state, status, payment, shipping_options, fixed_price_delivery_options, price_offer_delivery_options, ...}` — sample `article_id:"1327472806" title "Hp EliteDesk Mini-PC 800 G8 DM i7-11700,512,16gb,wifi" buy_now_price 450 (vs 45000 cents in search), images[0].transformations[0].url "https://img.ricardostatic.ch/.../t_1000x750"` |
| `m/listings similar` | `GET` | `/m/listings/{id}/similar` | `r-api-version: 2025-04-15`, `r-client-unique-id`, `accept`, `accept-charset`, `accept-language`, `user-agent`, `r-amz-date`, `x-authorization` | Query `count=20` — sample `GET /m/listings/1327472806/similar?count=20` (entry 27) | `200 {recommended_articles:[{id,title,category_id,image_url,buynow_price,...}, ...]}` — sample first `id 1323819960` |
| `m/home` | `GET` | `/m/home` | `r-client-unique-id`, `accept`, `accept-charset`, `accept-language`, `user-agent`, `r-amz-date`, `x-authorization`, `content-type: application/json` | Query `with_stories=true` | `200 {root_categories:[{category_id:string,category_name:string,category_type:string}], recent_searches:[], fresh_stories:[], communication:null, sections:[{source,title,search_link:{params:{search_sentence,category_nr,offset,limit,use_attribute_facets}},articles:[...]}, ...]}` — sample 8 root categories `40748 Clothing & accessories`, `40295 Household`, `41875 Sports`, `39825 Manual work`, `41126 Hobbies`, `38399 Antiques`, `42272 Watches`, `69956 Vehicles` |
| `m/ld/flags` | `GET` | `/m/ld/flags` | `r-client-unique-id`, `accept`, `accept-charset`, `accept-language`, `user-agent`, `r-amz-date`, `x-authorization` | — | `200` (feature flags JSON) |
| `m/notifications` | `GET` | `/m/notifications` | `accept`, `accept-charset`, `user-agent`, `accept-language`, `r-amz-date`, `x-authorization` | — | `401` anonymous (proves auth required; authed should be 200). Used as auth check. |
| `m/campaigns/shipping` | `GET` | `/m/campaigns/shipping` | `r-api-version: 2025-07-25` | — | `404` (not found, keep unverified) |
| `m/marketing/campaign` | `GET` | `/m/marketing/campaign` | `r-api-version: 2021-08-10`, `r-campaign-hash:` | — | `200` |

## Legacy web fallback (unverified — returns global, ignores searchTerm)

| Operation | Method | Path | Notes |
|---|---|---|---|
| `search` (web) | `GET` | `https://www.ricardo.ch/api/mfa/search?searchTerm=&size=&offset=&apiToken=` | Verified `200` but ignores `searchTerm` (total ~3.6M for `iphone`/`rolex`/`""`). Kept as `unverified — web fallback, returns global`. Do not delete; `docs/captures/endpoints.md` retains full table. |

## Header contract

All `/m/*` requests share:
```
accept: application/json
accept-charset: UTF-8
accept-language: ${language}   # "en" in HAR, "de" default in SDK
user-agent: MobileRicardo (sdk_gphone64_x86_64; android 14) ricardo.ch/9.12.0-91200 (release) deviceId/${ricardoHash}
r-client-unique-id: ${ricardoHash}   # uuidv4, equals X-Ricardo-Hash for web compat
r-amz-date: YYYYMMDDTHHMMSSZ          # per-request, new Date().toISOString().replace(/[-:]/g,"").replace(/\..+/,"Z")
x-authorization: AWS4-HMAC-SHA256 Credential=${ricardoHash}/YYYYMMDD/aws4_request, SignedHeaders=..., Signature=<hex>
r-api-version: per-endpoint (2025-04-16 search, 2026-02-24 listings, 2025-04-15 similar, 2025-07-25 shipping, 2021-08-10 campaign)
```

`r-amz-date` generated per-request via `new Date().toISOString().replace(/[-:]/g,"").replace(/\..+/,"Z")`. `x-authorization` in HAR is SigV4-ish with `Credential=${ricardoHash}/date/aws4_request`; signature derivation not reverse-engineered — SDK sends without secret first; if `410`/`401` observed, add header using `ricardoHash` as credential (HAR proves server accepts this credential form; secret may be empty or derived from `ricardo.apkm`).

## Verification samples

- `POST /m/search` `{"search_sentence":"mini pc","offset":0,"limit":40,"category_nr":"39091","sorting_type":0,"offer_types":[],"shippings":[],"member_classes":[],"use_attribute_facets":true,"promo_offer":true}` → `{"search_uid":"84316478-0846-4e53-ac36-c8a8cee6ae51","total_count":957,"price_facet":{"min":"1","max":"4900"},"attributes":[{"key":"pc_type","name":"Computer type",...}],"articles":[{"id":"1327472806","title":"Hp EliteDesk Mini-PC 800 G8 DM i7-11700,512,16gb,wifi",...}],"next_offset":39}`
- `GET /m/listings/1327472806?is_mg_auction_optional=true&is_mg_fixed_price_optional=true&is_mg_price_offer_optional=true` → `{"article_id":"1327472806","title":"Hp EliteDesk Mini-PC 800 G8 DM i7-11700,512,16gb,wifi","buy_now_price":"450",...}`
- `GET /m/listings/1327472806/similar?count=20` → `{"recommended_articles":[{"id":"1323819960",...}]}`
- `GET /m/home?with_stories=true` → `{"root_categories":[{"category_id":"40748","category_name":"Clothing & accessories"}, ...]}`
