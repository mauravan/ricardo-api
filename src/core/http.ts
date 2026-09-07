import { createHash, createHmac } from "node:crypto";
import type { Session } from "../session/session";
import { RicardoHttpError, RicardoNetworkError } from "./errors";
import type { TokenBucket } from "./rate-limit";

export interface FetchResponse {
  ok: boolean;
  status: number;
  statusText: string;
  text(): Promise<string>;
  /** Present for streaming responses (NDJSON). */
  body?: ReadableStream<Uint8Array> | null;
}

/** Minimal fetch shape the client relies on (the global `fetch` satisfies it). */
export type FetchLike = (
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  },
) => Promise<FetchResponse>;

export interface HttpClientOptions {
  baseURL: string; // e.g. https://www.ricardo.ch/api
  apiVersion: string; // e.g. v1
  session: Session;
  fetch: FetchLike;
  /** Optional client-level rate limiter. Acquired before every fetch. */
  limiter?: TokenBucket;
}

export interface RequestInit {
  body?: unknown;
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
}

/** Protocol-agnostic HTTP layer: applies session headers (per request, so
 *  auth set/refreshed mid-life takes effect immediately), JSON encodes bodies,
 *  and maps failures to typed errors. Shared by GraphQL, REST, and streaming. */
export class HttpClient {
  constructor(private readonly opts: HttpClientOptions) {}

  /** Send a request and parse the JSON body (or undefined if empty). */
  async request(
    method: string,
    path: string,
    init: RequestInit = {},
  ): Promise<unknown> {
    const res = await this.send(method, path, init);
    const text = await res.text();
    if (!res.ok) throw new RicardoHttpError(res.status, res.statusText, text);
    return text ? JSON.parse(text) : undefined;
  }

  /** Open a (possibly long-lived) response without buffering the body — for
   *  streaming endpoints. Caller consumes `response.body`. */
  async openStream(
    method: string,
    path: string,
    init: RequestInit = {},
  ): Promise<FetchResponse> {
    const res = await this.send(method, path, init);
    if (!res.ok)
      throw new RicardoHttpError(res.status, res.statusText, await res.text());
    return res;
  }

  private async send(
    method: string,
    path: string,
    init: RequestInit,
  ): Promise<FetchResponse> {
    const { session, fetch } = this.opts;
    const headers: Record<string, string> = {
      ...session.buildHeaders(),
      ...init.headers,
    };
    let body: string | undefined;
    if (typeof init.body === "string") {
      // Pre-encoded body (e.g. form-urlencoded); caller sets Content-Type.
      body = init.body;
    } else if (init.body !== undefined) {
      headers["Content-Type"] = "application/json; charset=utf-8";
      body = JSON.stringify(init.body);
    }
    // Generate AWS SigV4 x-authorization if not already present (mobile /m/* requires it)
    if (!headers["x-authorization"] && !headers["X-Authorization"]) {
      const url = this.buildUrl(path, init.query);
      const sig = this.buildAwsSignature(method, url, headers, body);
      if (sig) headers["x-authorization"] = sig;
    }
    try {
      if (this.opts.limiter) await this.opts.limiter.acquire(init.signal);
      return await fetch(this.buildUrl(path, init.query), {
        method,
        headers,
        body,
        signal: init.signal,
      });
    } catch (cause) {
      throw new RicardoNetworkError(cause);
    }
  }

  private buildAwsSignature(
    method: string,
    urlStr: string,
    headers: Record<string, string>,
    body: string | undefined,
  ): string | undefined {
    try {
      const secret = "AWS446e346d1-70d1-4c60-bdc2-7cb656bbb7e3";
      const deviceId = this.opts.session.ricardoHash;
      const url = new URL(urlStr);
      const amzDate = headers["r-amz-date"] ?? headers["R-Amz-Date"] ?? "";
      const date = amzDate.slice(0, 8);
      if (!amzDate || !date) return undefined;
      const host = url.host;
      // Build signing headers: allowlist + r-*
      const allowlist: Record<string, true> = {
        "content-md5": true,
        host: true,
        "user-agent": true,
        "accept-language": true,
      };
      const signing: Record<string, string> = {};
      // host is always signed
      signing.host = host;
      for (const [k, v] of Object.entries(headers)) {
        const lk = k.toLowerCase();
        if (lk === "host" || lk === "x-authorization" || lk === "authorization")
          continue;
        if (allowlist[lk] || lk.startsWith("r-")) {
          signing[lk] = v;
        }
      }
      // Ensure r-amz-date is included (already via r- prefix, but ensure)
      if (!signing["r-amz-date"] && amzDate) signing["r-amz-date"] = amzDate;
      // Ensure host is correct
      signing.host = host;
      const sortedKeys = Object.keys(signing).sort();
      const signedHeaders = sortedKeys.join(";");
      const canonicalHeaders =
        sortedKeys.map((k) => `${k}:${String(signing[k]).trim()}`).join("\n") +
        "\n";
      // canonical query string: sorted encoded query
      let canonicalQuery = "";
      if (url.search) {
        const params = new URLSearchParams(url.search);
        const entries: Array<[string, string]> = [];
        for (const [k, v] of params.entries()) entries.push([k, v]);
        entries.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
        canonicalQuery = entries
          .map(
            ([k, v]) =>
              `${encodeURIComponent(k)}=${encodeURIComponent(v).replace(/%20/g, "+")}`,
          )
          .join("&");
        // Match Java's encoding: they replace "=" with "%3D" for path? For query they keep "=".
        // For path, they encode "=" as "%3D" but for query they keep as is.
        // We'll keep standard encode.
      }
      const payload = body ?? "";
      const payloadHash = createHash("sha256")
        .update(payload, "utf8")
        .digest("hex");
      const encodedPath = url.pathname;
      // Java's URLBuilderKt.c encodes "=" as "%3D" for path, but our path has no "=" so fine
      const canonicalRequest = [
        method.toUpperCase(),
        encodedPath,
        canonicalQuery,
        canonicalHeaders,
        signedHeaders,
        payloadHash,
      ].join("\n");
      const hashedCanonical = createHash("sha256")
        .update(canonicalRequest, "utf8")
        .digest("hex");
      const credentialScope = `${date}/aws4_request`;
      const stringToSign = [
        "AWS4-HMAC-SHA256",
        amzDate,
        credentialScope,
        hashedCanonical,
      ].join("\n");
      const kDate = createHmac("sha256", secret).update(date, "utf8").digest();
      const kSigning = createHmac("sha256", kDate)
        .update("aws4_request", "utf8")
        .digest();
      const signature = createHmac("sha256", kSigning)
        .update(stringToSign, "utf8")
        .digest("hex");
      return `AWS4-HMAC-SHA256 Credential=${deviceId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    } catch {
      return undefined;
    }
  }

  private buildUrl(path: string, query?: RequestInit["query"]): string {
    const base = this.opts.baseURL.replace(/\/$/, "");
    const version = this.opts.apiVersion
      ? `/${this.opts.apiVersion.replace(/^\//, "").replace(/\/$/, "")}`
      : "";
    const p = path.startsWith("/") ? path : `/${path}`;
    let url = `${base}${version}${p}`;
    if (query) {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined) qs.set(k, String(v));
      }
      const s = qs.toString();
      if (s) url += `?${s}`;
    }
    return url;
  }
}
