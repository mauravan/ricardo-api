# Ricardo API captures — verified 2026-09-03 (partial)

> **Status: partially verified via `RITU/1.0` UA bypassing Cloudflare. HTML pages still 403.** Search endpoint verified; other operations inferred.

## Confirmed base
- **baseURL**: `https://www.ricardo.ch/api` — **apiVersion**: `mfa` — verified path `GET /api/mfa/search?searchTerm=&size=&offset=&apiToken=` returns 200 JSON with `User-Agent: RITU/1.0` or `ch.ricardo/android` + `Accept: application/json`. Example captured in `search-iphone-2026-09-03.har` (truncated sample) and `search-iphone-2026-09-03.json`.
- **Headers verified for search**: `Accept: application/json`, `User-Agent: ch.ricardo/android (Google Pixel 7a, OS 16)` or `RITU/1.0`, plus SDK headers `X-Ricardo-Hash/Source/Client-Identifier/App-Version/App-Id/Accept-Language` and optional `Cookie` for auth or `X-Ricardo-Auth` alias. Both 200.
- **Rate limiting**: `429` with `error code: 1015` after ~2 req/s burst; `429` body plain text `error code: 1015`. Retry with exponential backoff and 1 req/s throttle (as ritu `ricardoLimiter`).
- **HTML fallback**: `GET https://www.ricardo.ch/de/s/<query>/` and `GET https://www.ricardo.ch/de/a/<slug>-<id>/` both `403 cf-mitigated: challenge` even with RITU UA — requires browser clearance. HTML fallback in ritu parses `__NEXT_DATA__` but currently blocked.

## Verified endpoints

| Tutti analogue | Ricardo verified | Method | Path | Query | Response |
|---|---|---|---|---|---|
| `searchListingsByQuery` | ✅ verified | `GET` | `/api/mfa/search` | `searchTerm` (required), `size` (limit, server ignores and returns 60), `offset` (pagination, 0-based), `apiToken=` (empty) | `200 { seoMetadata, categories[], config{pageSize, nextOffset}, filters{price, itemCondition, location...}, articles[], totalArticlesCount }` |
| `getListingDetails` | ⚠️ unverified — no dedicated JSON endpoint found (probed `/api/mfa/article/{id}`, `/api/mfa/articles/{id}`, `/api/article/{id}` all 404 Next.js) | — | — | — | Article `id` must be resolved via `search` or HTML scrape (blocked). SDK implements `listings.get(id)` via `search` fallback + throws if not found, documented as unverified. |
| `categories` / `getFeaturedCategories` | ✅ verified (via search response) | `GET` | `/api/mfa/search` | same as search | `categories[] {id, name, slug, count}` and `categoryCounts`. Full tree not separate. |
| `searchLocalities` | ⚠️ unverified — ricardo location filter is `filters.location` object with `zipCode`/`range`, not a locality autocomplete. No `searchLocalities` endpoint found; SDK stubs `localities.search` to return `[]` and documents. |
| `getSearchSuggestions` | ✅ verified (via search) | `GET` | `/api/mfa/search` | `searchTerm` | `searchSuggestions[] {type, name, categorySlugAndId}` and `suggestedRefinements`. SDK maps `suggestions.search(query)` to `GET /search?searchTerm={query}` and returns `searchSuggestions`. |
| `searchListingsByUser` | ⚠️ unverified — no seller listings endpoint found (`/api/mfa/seller/{id}`, `/api/mfa/user/{id}` 404). SDK stubs `profiles.listings` to search with seller filter (if discovered) else returns `[]`. |
| `getPublicAccountInfo` | ⚠️ unverified — no seller profile JSON endpoint found. SDK stubs. |
| Auth | ⚠️ unverified — ritu validates via `GET /api/mfa/search?searchTerm=test&size=1` with `Cookie: ricardo_session=...` (200 with `articles` => valid). No Auth0 PKCE observed for this endpoint; SMG SSO likely for full login but not captured. SDK keeps Auth0 PKCE placeholder (`DEFAULT_OAUTH` unverified) and adds `Cookie` support via `Session` + `FileSessionStore`. |
| Messaging | ⚠️ unverified — no `GET /mfa/messaging/stream/*` observed; likely not on `api/mfa` (separate subsystem). SDK keeps `MessagingResource` but stubbed to throw `RicardoHttpError 501` pending capture. |

## Headers (verified for search)
```
Accept: application/json
User-Agent: ch.ricardo/android (Google Pixel 7a, OS 16)  // or RITU/1.0 both 200
X-Ricardo-Hash: <ricardoHash (uuidv4)>
X-Ricardo-Source: Android 11.0.0 (40011774)
X-Ricardo-Client-Identifier: android/4.50.0+env-live.ricardo-a9330101d
X-App-Version: Ricardo/4.50.0(40011774)/Android/36
X-App-Id: (empty)
Accept-Language: de
Cookie: ricardo_session=<token>  // when authed (also X-Ricardo-Auth alias)
```

## Rate limit & retry
- Throttle 1 req/s (p-limit 1). On `429` or body contains `1015`, retry with backoff (as `withRetry` in ritu). SDK `HttpClient` maps 429 to `RicardoHttpError` and leaves retry to caller; `SearchBuilder` documents throttle.

## Capture artifacts
- `search-iphone-2026-09-03.json` — truncated sample of `GET /api/mfa/search?searchTerm=iphone&size=5` (200, includes 1 article sample, config, filters).
- `search-iphone-2026-09-03.har` — minimal HAR (request/response pair) for same search.
- Full JSON not committed due to size; see `src/lib/marketplaces/ricardo.ts` in ritu for mapping.

## Reproduce
```sh
curl -H "Accept: application/json" -H "User-Agent: RITU/1.0" "https://www.ricardo.ch/api/mfa/search?searchTerm=iphone&size=5&apiToken=" | jq
# with SDK: npm run demo (anonymous search) now hits real API via REST, not GraphQL
```

Remaining capture: run browser with DevTools after solving Cloudflare to capture HTML `__NEXT_DATA__` for article detail, seller profile, and to confirm Auth0 hosts if login uses SMG SSO. Record HARs to `docs/captures/*.har` and update `endpoints.md`.
