# Auth capture — partially verified 2026-09-03

**Verified:**
- `GET https://www.ricardo.ch/api/mfa/search?searchTerm=test&size=1&apiToken=` with `Cookie: ricardo_session=<token>` returns `200` with `articles[]` => valid session. Without cookie also 200 (anonymous). Validation in `ritu/src/lib/auth/validate.ts` uses this check.
- `User-Agent` `RITU/1.0` and `ch.ricardo/android` both bypass Cloudflare for `/api/mfa/search`; HTML pages still 403.

**Unverified (kept from tutti analogue):**
- `authBaseURL`: `https://auth.ricardo.ch` (alt: `https://login.smg.ch`, `https://account.ricardo.ch`, `https://auth.smg.ch`)
- `clientId`: `lykoMeGKh14siOyOVev0QBAB8vsSKV7b` (tutti value; ricardo value unverified — capture required)
- `redirectUri`: `ch.ricardo://auth.ricardo.ch/android/ch.ricardo/callback`
- `audience`: `https://api.ricardo.ch`
- `scope`: `openid profile email`
- Flow `GET /authorize` → `GET /u/login` (captcha `data:` URI) → `captcha.solve` → `POST` credentials + captcha → `/authorize/resume` → `code` → `POST /oauth/token` → JWT → `POST /v1/account/authenticateJWT` (tutti path) — **not observed for ricardo `api/mfa`**. For ricardo, auth is cookie-based; `account.useToken(token)` should store as `Cookie`.

**Decision:**
- Keep `DEFAULT_OAUTH` placeholder for possible SMG SSO login, but document as unverified. Primary auth for `api/mfa` is cookie session (capture `ricardo_session` via browser after login, or via `POST /api/mfa/login` if exists — not yet captured). To capture, log in via browser, copy `Set-Cookie: ricardo_session`, save via `FileSessionStore`, and verify with `validateRicardoSession`.

**To verify full login:**
1. Proxy Android APK with `apk-mitm` or use browser with DevTools, complete login (email+password+Turnstile/hCaptcha if present), save HAR.
2. Look for `POST https://www.ricardo.ch/api/mfa/login` or `https://auth.ricardo.ch/authorize` etc., and `Set-Cookie` headers.
3. Update `src/auth/login.ts` accordingly: if plain `POST /api/mfa/login` with CSRF + Turnstile, replace PKCE with direct POST; keep `CaptchaProvider` abstraction (maps Turnstile to manual).

Record HAR here after capture.
