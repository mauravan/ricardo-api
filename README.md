<h1 align="center">Welcome to ricardo-api 👋</h1>
<p align="center">
  <img alt="Version" src="https://img.shields.io/npm/v/ricardo-api.svg">
  <a href="https://mauravan.github.io/ricardo-api/" target="_blank">
    <img alt="Documentation" src="https://img.shields.io/badge/documentation-yes-brightgreen.svg" />
  </a>
  <a href="https://github.com/mauravan/ricardo-api/blob/main/LICENSE" target="_blank">
    <img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg" />
  </a>
  <a href="https://github.com/mauravan/ricardo-api/actions/workflows/ci.yml" target="_blank">
    <img alt="CI" src="https://img.shields.io/github/actions/workflow/status/mauravan/ricardo-api/ci.yml?branch=main" />
  </a>
</p>

> 🌐 TypeScript client for [ricardo.ch](https://www.ricardo.ch): keyword and category search with filters, listing details, category taxonomy, and search-box suggestions. Anonymous, zero runtime dependencies, ESM + CJS + types.

### 🏠 [Homepage](https://github.com/mauravan/ricardo-api)

### 📖 [Documentation](https://mauravan.github.io/ricardo-api/)

## Features

- 🔍 Fluent **search** with filters (category, price, location, intervals, single/multi-select) + cursor pagination
- 📦 **Listings**, **categories**, featured categories, search **suggestions**
- 🛡 Built-in **rate limiting** (token bucket, on by default) so you can't accidentally DoS the API
- 🧩 Object-oriented (one instance per anonymous client), **zero runtime dependencies**, ESM + CJS + types

## Install

```sh
npm install ricardo-api
```

Requires Node 18+ (global `fetch`) or a browser.

## Usage

```ts
import { RicardoClient } from "ricardo-api";

const client = new RicardoClient(); // anonymous; random device hash

// Fluent search with filters
const result = await client
  .search("ledersofa")
  .category("furniture")
  .price({ min: 100, max: 5000 }) // or .freeOnly()
  .location(locality)
  .select("companyAd", "private") // generic single-select
  .multiSelect("language", ["de"]) // generic multi-select
  .interval("year", { min: 2015 }) // generic numeric range
  .sort("timestamp", "desc")
  .fetch();

result.totalCount; // number
result.listings; // Listing[] (this page)
result.availableFilters; // filter names/options for this category
await result.next(); // next page (or null)
for await (const l of result.paginate()) {
  /* every listing across pages */
}

// Listing detail + token browse
const listing = await client.listings.get("81078697");
const page = await client.browse(searchToken).fetch();

// Filters for a category without fetching a listings page
const { availableFilters } = await client.search().category("cars").updateFilters();

// Categories, featured, autocomplete
await client.categories.tree();
await client.categories.featured();
await client.suggestions.search("sof");
```

### Rate limiting

By default this library rate-limits every outbound request — you cannot overload `api.ricardo.ch` through this client. The default is a token bucket at 5 requests/second sustained, burst 10.

```ts
// default: limiter is on
const client = new RicardoClient();

// tune the limits
const client = new RicardoClient({
  rateLimit: { tokensPerSecond: 2, burst: 5 },
});

// disable (not recommended)
const client = new RicardoClient({ rateLimit: false });
```

When the limit is reached, requests **queue and wait** — calls return normally; no exceptions. A caller-supplied `AbortSignal` cancels the wait. The limiter is per-`RicardoClient` instance and shared across search, listings, categories, suggestions, and streaming endpoints.

## Demos

```sh
npm run demo            # search "ubiquiti" + pagination
npm run demo:queries    # categories, featured, suggestions, updateFilters
```

## Scripts

```sh
npm run build       # bundle ESM + CJS + .d.ts into dist/
npm run typecheck   # tsc --noEmit
npm run check       # Biome lint + format (write)
npm run docs        # generate API docs (TypeDoc) into docs/
```

## Caveats

- **Most filter element shapes are inferred** — captured requests only ever sent empty constraint arrays. Keyword search is unaffected; verify `location`/`interval`/`select` payloads against live traffic. The `price` shape is now verified against the app's `ListingPriceConstraint` input adapter: `freeOnly` is a **required** non-null Boolean (defaulted to `false` by `.price()`), `min`/`max` are optional.
- **Default headers** mirror a captured Android client; override via `new RicardoClient({ app: { … } })`.

## Author

👤 **mauravan**

* Github: [@mauravan](https://github.com/mauravan)

## Acknowledgments

Inspired by the open-source approach of [filippofinke/tutti-api](https://github.com/filippofinke/tutti-api).

## 🤝 Contributing

Contributions, issues and feature requests are welcome!<br />
Feel free to check the [issues page](https://github.com/mauravan/ricardo-api/issues). Commits follow [Conventional Commits](https://www.conventionalcommits.org/); releases are automated with [release-please](https://github.com/googleapis/release-please) — merged commits accumulate into a Release PR that, once merged, tags the version and publishes to npm.

## Show your support

Give a ⭐️ if this project helped you!

## 📝 License

Copyright © 2026 mauravan.<br />
This project is [MIT](./LICENSE) licensed.

***