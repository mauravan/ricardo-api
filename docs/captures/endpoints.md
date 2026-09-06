# Endpoints — verified 2026-09-03 (partial) + unverified stubs

| Operation | Method | Path (verified) | Query / Body | Response |
|---|---|---|---|---|
| `search` (was `searchListingsByQuery`) | `GET` | `/api/mfa/search` | `searchTerm` (string, required), `size` (int, limit; server returns 60 regardless), `offset` (int, pagination cursor, 0-based; nextOffset from `config.nextOffset`), `apiToken=` (empty) — verified 200 | `200 { articles: Article[], totalArticlesCount: number, categories: Category[], config: {pageSize, nextOffset}, filters: Filters, searchSuggestions: Suggestion[] }` — `Article {id, title, endDate, categoryId, conditionKey, image, hasBuyNow, buyNowPrice, bidPrice, sellerId, shipping[]}` |
| `getListingDetails` | — | — | — | ⚠️ no JSON endpoint; `GET /api/mfa/article/{id}` etc 404. SDK `listings.get(id)` tries `GET /api/mfa/search?searchTerm={id}` fallback + HTML scrape (403), throws `RicardoHttpError 501` if not found. Verify via browser HAR. |
| `categories` | `GET` | `/api/mfa/search` | `searchTerm=` (empty) `size=1` | `categories[]` from same search response (verified). Full tree not separate. |
| `getSearchSuggestions` | `GET` | `/api/mfa/search` | `searchTerm` | `searchSuggestions[]` (verified). |
| `updateFilters` | `GET` | `/api/mfa/search` | `searchTerm, filters` | `filters` object from same search (verified). SDK maps `SearchBuilder.updateFilters()` to same GET without `articles`. |
| `searchLocalities` | — | — | — | ⚠️ no endpoint; ricardo location filter is `filters.location {zipCode, range}`, not autocomplete. SDK `localities.search` stub returns `[]`. |
| `searchListingsByUser` | — | — | — | ⚠️ no seller listings endpoint (`/api/mfa/seller/{id}` 404). Stub. |
| `getPublicAccountInfo` | — | — | — | ⚠️ no seller profile endpoint. Stub. |
| `authenticateJWT` | — | — | — | ⚠️ unverified; ricardo auth verified via `Cookie: ricardo_session` on `GET /api/mfa/search` (200 with `articles` => valid). No `POST /account/authenticateJWT` observed for `api/mfa`. SDK `account.useToken(token)` stores as `Cookie` + `X-Ricardo-Auth`. `login()` keeps Auth0 PKCE placeholder (unverified). |
| `messaging/stream` | — | — | — | ⚠️ no messaging endpoint on `api/mfa`; separate subsystem. SDK `messaging` stubs 501. |

**Verified request example:**
```http
GET https://www.ricardo.ch/api/mfa/search?searchTerm=iphone&size=5&apiToken= HTTP/1.1
Accept: application/json
User-Agent: ch.ricardo/android (Google Pixel 7a, OS 16)
X-Ricardo-Hash: <uuid>
X-App-Version: Ricardo/4.50.0(40011774)/Android/36
```

**Notes:**
- Rate limit: `429` + `error code: 1015` plain text after burst; retry with backoff, throttle 1 req/s.
- `size` param currently ignored by server (always 60); SDK keeps it for compat but documents.
- `offset` pagination verified to change result set; `config.nextOffset` is hint for next page.
- If full capture shows additional REST paths (e.g. `/api/mfa/article/{id}` with different auth), replace stubs and update `src/operations` + resources.
