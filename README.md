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
    <img alt="CI" src="https://github.com/mauravan/ricardo-api/actions/workflows/ci.yml/badge.svg" />
  </a>
</p>

> 🌐 Unofficial, dependency-free TypeScript client for the (reverse-engineered) private API of [ricardo.ch](https://www.ricardo.ch): search & filters, listings, categories, suggestions, and Auth0 login.

> ⚠️ **Not affiliated with ricardo.ch.** Reverse-engineered for interoperability and research. Respect ricardo.ch's terms of service and rate limits — use at your own risk.
### 🏠 [Homepage](https://github.com/mauravan/ricardo-api)

### 📖 [Documentation](https://mauravan.github.io/ricardo-api/)

## Disclaimer

> **Disclaimer:** This project is not affiliated with, endorsed by, or sponsored by ricardo.ch or SMG Swiss Marketplace Group. It uses a reverse-engineered private API for interoperability and research. Use at your own risk; respect ricardo.ch Terms of Service, rate limits, and applicable law.


## Features

- 🔍 Fluent **search** with filters (category, price, location, intervals, single/multi-select) + cursor pagination
- 📦 **Listings**, **categories**, featured categories, search **suggestions**
- 🔐 **Auth0 login** (authorization-code + PKCE) with a swappable captcha provider (manual, or Google Gemini vision)
- 🖼️ Built-in **dependency-free SVG→PNG** engine (renders the login captcha for OCR)
- 💾 Pluggable **session persistence** (in-memory / file / your own store)
- 🧩 Object-oriented (one instance per account), **zero runtime dependencies**, ESM + CJS + types

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

### Authentication

ricardo uses Auth0, then exchanges the JWT for a ricardo **session token** sent as `X-Ricardo-Auth` (~1-year validity).

```ts
import { LLMCaptchaProvider, ManualCaptchaProvider, Session } from "ricardo-api";

// Full login. The Auth0 page has a captcha, solved by a swappable provider:
//   ManualCaptchaProvider (default) — saves the image, you type the text
//   LLMCaptchaProvider — Google Gemini vision (needs GEMINI_API_KEY)
await client.account.login({ username, password, captcha: new LLMCaptchaProvider() });

// Or bring your own token / Auth0 access token:
client.account.useToken("mc1x…");
await client.account.authenticateJWT(auth0AccessToken);
```

### Session persistence

`Session.toJSON()/fromJSON()` give a plain snapshot; a **`SessionStore`** persists it under a key. Providers are interchangeable — `InMemorySessionStore` and `FileSessionStore` ship; add Redis/DB by implementing `save / load / delete / keys`.

```ts
import { FileSessionStore, Session, RicardoClient } from "ricardo-api";

const store = new FileSessionStore("./sessions");
await store.save("alice", client.session.toJSON());

const snap = await store.load("alice"); // restore later, no re-login
const restored = new RicardoClient({ session: snap ? Session.fromJSON(snap) : undefined });
```

## Demos


Store a session once; every demo loads it from `./.ricardo-sessions` (gitignored):

```sh
# 1) store a session (token fast-path, or full login)
RICARDO_TOKEN=<X-Ricardo-Auth> npm run demo:session
#   or: GEMINI_API_KEY=… RICARDO_USER=… RICARDO_PASS=… npm run demo:session

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
- **Login captcha is interactive by default** — the minted session token is long-lived (~1yr), so you log in rarely; `useToken()` skips it. `auth.ricardo.ch` is behind Cloudflare.
- **Default headers** mirror a captured Android client; override via `new RicardoClient({ app: { … } })`.

## Author

👤 **mauravan**

* Github: [@mauravan](https://github.com/mauravan)

## Acknowledgments

Heavily inspired by [filippofinke/tutti-api](https://github.com/filippofinke/tutti-api) — the original reverse-engineered API client for tutti.ch that pioneered much of the approach reused here.

## 🤝 Contributing

Contributions, issues and feature requests are welcome!<br />
Feel free to check the [issues page](https://github.com/mauravan/ricardo-api/issues). Commits follow [Conventional Commits](https://www.conventionalcommits.org/); releases are automated with [release-please](https://github.com/googleapis/release-please) — merged commits accumulate into a Release PR that, once merged, tags the version and publishes to npm.

## Show your support

Give a ⭐️ if this project helped you!

## 📝 License

Copyright © 2026 mauravan.<br />
This project is [MIT](./LICENSE) licensed.

***

_Reverse-engineered for educational purposes — not affiliated with ricardo.ch._
