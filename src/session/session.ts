import { uuidv4 } from "../core/util";

/** App identity headers. Defaults mirror a captured ricardo Android client. */
export interface AppConfig {
  version: string; // X-App-Version
  source: string; // X-Ricardo-Source
  clientId: string; // X-Ricardo-Client-Identifier
  appId: string; // X-App-Id
  userAgent: string; // User-Agent (WAF checks this — Node's default UA is blocked)
}

/** Authenticated-account state. Empty for anonymous sessions (v1). This is the
 *  seam for future login: populate it and every subsequent request is authed. */
export interface AuthState {
  token: string;
  refreshToken?: string;
  expiresAt?: number;
  accountId?: string;
}

export interface SessionSnapshot {
  ricardoHash: string;
  app: AppConfig;
  language: string;
  auth?: AuthState;
}

export interface SessionOptions {
  /** Per-install device hash. Pass a saved one to pin an account; else random. */
  ricardoHash?: string;
  app?: Partial<AppConfig>;
  language?: string;
  auth?: AuthState;
}

const DEFAULT_APP: AppConfig = {
  version: "Ricardo/4.50.0(40011774)/Android/36",
  source: "Android 11.0.0 (40011774)",
  clientId: "android/4.50.0+env-live.ricardo-a9330101d",
  appId: "",
  userAgent: "ch.ricardo/android (Google Pixel 7a, OS 16)",
};

/** Per-account state and the single source of request headers. One Session =
 *  one account; construct several for several accounts. */
export class Session {
  ricardoHash: string;
  app: AppConfig;
  language: string;
  auth?: AuthState;

  constructor(opts: SessionOptions = {}) {
    this.ricardoHash = opts.ricardoHash ?? uuidv4();
    this.app = { ...DEFAULT_APP, ...opts.app };
    this.language = opts.language ?? "de";
    this.auth = opts.auth;
  }

  /** Headers for every request. Called per request so auth changes apply at once. */
  buildHeaders(): Record<string, string> {
    const amzDate = new Date()
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\..+/, "Z");
    return {
      "X-Ricardo-Hash": this.ricardoHash,
      "X-Ricardo-Source": this.app.source,
      "X-Ricardo-Client-Identifier": this.app.clientId,
      "X-App-Version": this.app.version,
      "X-App-Id": this.app.appId,
      accept: "application/json",
      "accept-charset": "UTF-8",
      "accept-language": this.language,
      "user-agent": `MobileRicardo (sdk_gphone64_x86_64; android 14) ricardo.ch/9.12.0-91200 (release) deviceId/${this.ricardoHash}`,
      "r-client-unique-id": this.ricardoHash,
      "r-amz-date": amzDate,
      ...this.authHeaders(),
    };
  }

  /** Ricardo authenticates via `Cookie: ricardo_session=<token>` for `api/mfa` (verified) and `X-Ricardo-Auth` alias. */
  protected authHeaders(): Record<string, string> {
    if (!this.auth?.token) return {};
    return {
      "X-Ricardo-Auth": this.auth.token,
      Cookie: `ricardo_session=${this.auth.token}`,
    };
  }

  setAuth(auth: AuthState): void {
    this.auth = auth;
  }
  clearAuth(): void {
    this.auth = undefined;
  }
  get isAuthenticated(): boolean {
    return Boolean(this.auth?.token);
  }

  /** Persist a (possibly logged-in) account; restore with `Session.fromJSON`. */
  toJSON(): SessionSnapshot {
    return {
      ricardoHash: this.ricardoHash,
      app: this.app,
      language: this.language,
      auth: this.auth,
    };
  }
  static fromJSON(s: SessionSnapshot): Session {
    return new Session({
      ricardoHash: s.ricardoHash,
      app: s.app,
      language: s.language,
      auth: s.auth,
    });
  }
}
