import { Authenticator } from "remix-auth";
import { createCookieSessionStorage } from "@remix-run/node";
import { StravaProfile, StravaStrategy } from "~/lib/strava/oauth/strategy";
import { OAuth2Tokens } from "arctic";

type StravaTokens = OAuth2Tokens & { data: { athlete: StravaProfile } };

/**
 * * This function retrieves the user profile from the Strava tokens.
 * It extracts the athlete information and returns it as a StravaProfile object.
 * @todo  This should interact with the database to create or update the user profile.
 *        It should also handle the case where the user profile does not exist yet.
 * @warning This is a placeholder implementation.
 * @param tokens - The OAuth2 tokens received from Strava after authentication.
 * @returns A promise that resolves to a StravaProfile object containing the user's Strava profile information.
 */
async function getUser(tokens: StravaTokens/*, request: Request*/): Promise<StravaProfile> {
  return await {
    id: tokens.data.athlete.id,
    username: tokens.data.athlete.username,
    firstname: tokens.data.athlete.firstname,
    lastname: tokens.data.athlete.lastname,
    profile_medium: tokens.data.athlete.profile_medium
  };
}

// Create a session storage
export const { getSession, commitSession, destroySession } = createCookieSessionStorage<StravaProfile>({
  cookie: {
    name: "__session",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: ["s3cr3t"], // replace this with an actual secret
    secure: process.env.NODE_ENV === "production",
  },
});

// Create an instance of the authenticator, pass a generic with what
// strategies will return
export const authenticator = new Authenticator<StravaProfile>();

authenticator.use(
  new StravaStrategy(
    {
      cookie: "oauth2", // Optional, can also be an object with more options

      clientId: process.env.STRAVA_CLIENT_ID || "MISSING_CLIENT_ID",
      clientSecret: process.env.STRAVA_CLIENT_SECRET || "MISSING_CLIENT_SECRET",

      authorizationEndpoint: process.env.STRAVA_AUTHORIZATION_ENDPOINT || "https://MISSING_AUTHORIZATION_ENDPOINT",
      tokenEndpoint: process.env.STRAVA_TOKEN_ENDPOINT || "https://MISSING_TOKEN_ENDPOINT",
      redirectURI: process.env.STRAVA_REDIRECT_URI || "http://MISSING_REDIRECT_URI",

      scopes: ["read_all,profile:read_all,activity:read_all"],
      //codeChallengeMethod: CodeChallengeMethod.S256,
    },
    async ({ tokens/*, request */}) => {
      console.log("OAuth2 Strategy: tokens", tokens);
      return await getUser(tokens as StravaTokens);
    }
  ),
  "strava"
);