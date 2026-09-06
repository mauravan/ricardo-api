import { type CaptchaProvider, ManualCaptchaProvider } from "../auth/captcha";
import {
  type LoginCredentials,
  type OAuthConfig,
  type OAuthTokens,
  type RawFetch,
  runLoginFlow,
} from "../auth/login";
import type { HttpClient } from "../core/http";
import type { Session } from "../session/session";

interface AuthenticateJWTResponse {
  message: string;
  public_account_id: string;
  token: string;
  uuid?: string;
}

export interface AuthenticatedAccount {
  publicAccountId: string;
  /** The ricardo session token (sent as `X-Ricardo-Auth`). */
  token: string;
}

export interface LoginOptions extends LoginCredentials {
  /** Captcha strategy. Defaults to {@link ManualCaptchaProvider}. */
  captcha?: CaptchaProvider;
}

/** Account auth + reads (REST on api.ricardo.ch). */
export class AccountResource {
  constructor(
    private readonly http: HttpClient,
    private readonly session: Session,
    private readonly rawFetch: RawFetch,
    private readonly oauth: OAuthConfig,
  ) {}

  /**
   * Exchange an Auth0 access token (JWT) for a ricardo session token and store it
   * on the session. Subsequent requests are authenticated via `Cookie: ricardo_session` (verified) and `X-Ricardo-Auth` alias.
   * NOTE: `POST /account/authenticateJWT` not verified for `api/mfa`; kept for compat, may 404. Use `useToken(cookie)` for `api/mfa`.
   */
  async authenticateJWT(accessToken: string): Promise<AuthenticatedAccount> {
    const res = (await this.http.request("POST", "/account/authenticateJWT", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })) as AuthenticateJWTResponse;

    const account: AuthenticatedAccount = {
      publicAccountId: res.public_account_id,
      token: res.token,
    };
    this.session.setAuth({
      token: account.token,
      accountId: account.publicAccountId,
    });
    return account;
  }

  /**
   * Full login: run the Auth0 flow (solving the captcha via the provider),
   * then exchange the resulting JWT for a ricardo session.
   */
  async login(options: LoginOptions): Promise<AuthenticatedAccount> {
    const tokens = await this.runOAuth(
      options,
      options.captcha ?? new ManualCaptchaProvider(),
    );
    return this.authenticateJWT(tokens.accessToken);
  }

  /** Run only the OAuth/Auth0 portion, returning raw tokens (no API exchange). */
  runOAuth(
    credentials: LoginCredentials,
    captcha: CaptchaProvider,
  ): Promise<OAuthTokens> {
    return runLoginFlow({
      credentials,
      captcha,
      config: this.oauth,
      fetch: this.rawFetch,
    });
  }
  /** Authenticate with a ricardo session cookie captured elsewhere (browser/proxy). For `api/mfa`, token is `ricardo_session` cookie value. */
  useToken(token: string, accountId?: string): void {
    this.session.setAuth({ token, accountId });
  }

  /** Validate current session via `GET /m/notifications` (401 anonymous, 200 authed). Returns true if authenticated. */
  async validate(): Promise<boolean> {
    try {
      await this.http.request("GET", "/notifications");
      return true;
    } catch (err) {
      if (err instanceof Error && (err as { status?: number }).status === 401)
        return false;
      // RicardoHttpError has status
      const status = (err as unknown as { status?: number })?.status;
      if (status === 401) return false;
      throw err;
    }
  }

  /** The signed-in account's profile (requires an authenticated session). */
  profile(): Promise<unknown> {
    return this.http.request("GET", "/account/profile.json");
  }

  logout(): void {
    this.session.clearAuth();
  }
}
