import { Strategy } from "remix-auth/strategy";

import { OAuth2Strategy, OAuth2RequestError } from "remix-auth-oauth2";
import { generateState, generateCodeVerifier, Strava } from "arctic";
import { redirect } from "./lib/redirect";
import { StateStore } from "./lib/store";

export interface StravaProfile {
  id: string;
  username: string | null;
  firstname: string;
  lastname: string;
  profile_medium: string;
  created_at: string;
  token: object;
}

export class StravaStrategy extends Strategy<
  StravaProfile,
  OAuth2Strategy.VerifyOptions
> {
  override name = "strava";
  protected client: Strava;

  constructor(
    protected options: OAuth2Strategy.ConstructorOptions,
    verify: Strategy.VerifyFunction<StravaProfile, OAuth2Strategy.VerifyOptions>
  ) {
    super(verify);
    if (!options.clientId || !options.clientSecret || !options.redirectURI) {
      throw new Error(
        "StravaStrategy requires clientId, clientSecret, and redirectURI options"
      );
    }
    this.client = new Strava(
      options.clientId,
      options.clientSecret,
      options.redirectURI.toString()
    );
  }

  /*
   * This method handles Strava's OAuth2 flow.
   * This method will be called when the user is redirected back to your app
   * after authorizing with Strava.
   * @see https://github.com/sergiodxa/remix-auth-oauth2/blob/main/src/index.ts#L61
   */
  override async authenticate(request: Request): Promise<StravaProfile> {
    const url = new URL(request.url);

    const stateUrl = url.searchParams.get("state");

    if (!stateUrl) {
      const { state, codeVerifier, url } = this.createAuthorizationURL();

      url.search = this.authorizationParams(url.searchParams).toString();

      const store = StateStore.fromRequest(request, this.cookieName);
      store.set(state, codeVerifier);

      throw redirect(url.toString(), {
        headers: {
          "Set-Cookie": store
            .toSetCookie(this.cookieName, this.cookieOptions)
            .toString(),
        },
      });
    }

    const store = StateStore.fromRequest(request, this.cookieName);

    if (!store.has()) {
      throw new ReferenceError("Missing state on cookie.");
    }

    if (!store.has(stateUrl)) {
      throw new RangeError("State in URL doesn't match state in cookie.");
    }

    const error = url.searchParams.get("error");

    if (error) {
      const description = url.searchParams.get("error_description");
      const uri = url.searchParams.get("error_uri");
      throw new OAuth2RequestError(error, description, uri, stateUrl);
    }

    const code = url.searchParams.get("code");

    if (!code) throw new ReferenceError("Missing code in the URL");

    const codeVerifier = store.get(stateUrl);

    if (!codeVerifier) {
      throw new ReferenceError("Missing code verifier on cookie.");
    }

    const tokens = await this.validateAuthorizationCode(code);

    const user = await this.verify({ request, tokens });

    return user;
  }

  /**
   * Create the authorization URL for the OAuth 2.0 flow.
   * @returns { state: string, codeVerifier: string, url: URL }
   * @see https://github.com/sergiodxa/remix-auth-oauth2/blob/main/src/index.ts#L129-L141
   */
  protected createAuthorizationURL() {
    const state = generateState();
    const codeVerifier = generateCodeVerifier();

    const url = this.client.createAuthorizationURL(
      state,
      this.options.scopes ?? []
    );

    return { state, codeVerifier, url };
  }

  /**
   * Return extra parameters to be included in the authorization request.
   *
   * Some OAuth 2.0 providers allow additional, non-standard parameters to be
   * included when requesting authorization.  Since these parameters are not
   * standardized by the OAuth 2.0 specification, OAuth 2.0-based authentication
   * strategies can override this function in order to populate these
   * parameters as required by the provider.
   *
   * @see https://github.com/sergiodxa/remix-auth-oauth2/blob/main/src/index.ts#L152C1-L166C3
   */
  protected authorizationParams(params: URLSearchParams): URLSearchParams {
    return new URLSearchParams(params);
  }

  /**
   * Returns the name of the cookie used to store the state and code verifier.
   * @see https://github.com/sergiodxa/remix-auth-oauth2/blob/main/src/index.ts#L49C1-L54C3
   */
  private get cookieName() {
    if (typeof this.options.cookie === "string") {
      return this.options.cookie || "oauth2";
    }
    return this.options.cookie?.name ?? "oauth2";
  }

  /**
   * Returns the options for the cookie used to store the state and code verifier.
   * @see https://github.com/sergiodxa/remix-auth-oauth2/blob/main/src/index.ts#L129-L141
   */
  private get cookieOptions() {
    if (typeof this.options.cookie !== "object") return {};
    return this.options.cookie ?? {};
  }

  /**
   * Validates the authorization code and retrieves the access token.
   * @param code The authorization code received from Strava.
   */
  protected async validateAuthorizationCode(code: string) {
    return this.client.validateAuthorizationCode(code);
  }
}
