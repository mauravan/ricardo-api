import { uuidv4 } from "../core/util";

/** App identity headers. Defaults mirror a captured ricardo Android client. */
export interface AppConfig {
  version: string; // X-App-Version
  source: string; // X-Ricardo-Source
  clientId: string; // X-Ricardo-Client-Identifier
  appId: string; // X-App-Id
  userAgent: string; // User-Agent (WAF checks this — Node's default UA is blocked)
}

export interface SessionOptions {
  /** Per-install device hash. Pass a saved one to pin an account; else random. */
  ricardoHash?: string;
  app?: Partial<AppConfig>;
  language?: string;
}

const DEFAULT_APP: AppConfig = {
  version: "Ricardo/4.50.0(40011774)/Android/36",
  source: "Android 11.0.0 (40011774)",
  clientId: "android/4.50.0+env-live.ricardo-a9330101d",
  appId: "",
  userAgent: "ch.ricardo/android (Google Pixel 7a, OS 16)",
};

/**
 * Per-install device identity + header config used by every request.
 * One instance = one anonymous client. Pass your own `Session` to customise
 * the device hash, app identity headers, and language.
 */
export class Session {
  ricardoHash: string;
  app: AppConfig;
  language: string;

  constructor(opts: SessionOptions = {}) {
    this.ricardoHash = opts.ricardoHash ?? uuidv4();
    this.app = { ...DEFAULT_APP, ...opts.app };
    this.language = opts.language ?? "de";
  }

  /** Headers for every request. */
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
    };
  }
}
