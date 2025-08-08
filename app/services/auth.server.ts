import { OAuth2Tokens } from "arctic";
import { Authenticator } from "remix-auth";
import { StravaProfile, StravaStrategy } from "~/lib/strava/oauth/strategy";

import { getEnvironment } from "lib/environment";

export type StravaTokens = OAuth2Tokens & { data: { athlete: StravaProfile } };

/**
 * * This function retrieves the user profile from the Strava tokens.
 * It extracts the athlete information and returns it as a StravaProfile object.
 * @todo  This should interact with the database to create or update the user profile.
 *        It should also handle the case where the user profile does not exist yet.
 * @warning This is a placeholder implementation.
 * @param tokens - The OAuth2 tokens received from Strava after authentication.
 * @returns A promise that resolves to a StravaProfile object containing the user's Strava profile information.
 */
async function getUser(
  tokens: StravaTokens /*, request: Request*/
): Promise<StravaProfile> {
  const { athlete, ...token } = tokens.data;
  const stravaProfile: StravaProfile = {
    id: athlete.id,
    username: athlete.username,
    firstname: athlete.firstname,
    lastname: athlete.lastname,
    profile_medium: athlete.profile_medium,
    created_at: athlete.created_at,
    token,
  };
  return stravaProfile;
}

// Create an instance of the authenticator, pass a generic with what
// strategies will return
export const authenticator = new Authenticator<StravaProfile>();

authenticator.use(
  new StravaStrategy(
    {
      cookie: "oauth2", // Optional, can also be an object with more options

      clientId: getEnvironment("STRAVA_CLIENT_ID"),
      clientSecret: getEnvironment("STRAVA_CLIENT_SECRET"),
      redirectURI: [
        getEnvironment("URL"),
        getEnvironment("STRAVA_REDIRECT_PATH"),
      ].join(""),

      authorizationEndpoint: getEnvironment("STRAVA_AUTHORIZATION_ENDPOINT"),
      tokenEndpoint: getEnvironment("STRAVA_TOKEN_ENDPOINT"),

      scopes: ["read", "read_all", "profile:read_all", "activity:read_all"],
    },
    async ({ tokens /*, request */ }) => {
      return await getUser(tokens as StravaTokens);
    }
  ),
  "strava"
);
