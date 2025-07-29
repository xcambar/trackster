import { getEnvironment } from "lib/environment";
import { AccessToken, Strava } from "strava";
import { supabase } from "~/services/supabase.server";

export function getStravaAPIClient(stravaToken: AccessToken) {
  return new Strava(
    {
      client_id: getEnvironment("STRAVA_CLIENT_ID"),
      client_secret: getEnvironment("STRAVA_CLIENT_SECRET"),
      on_token_refresh: async (refreshedToken) => {
        /**
         * @todo Improve on token refresh
         */
        console.log("TOKEN SHOULD REFESH", refreshedToken);
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();
        if (!user || error) {
          console.log("Could not find user. Quitting.", error);
          return;
        }
        console.log("current token", user.user_metadata.strava_profile.token);
        user.user_metadata.strava_profile.token = refreshedToken;

        const { data, error: err } = await supabase.auth.updateUser({
          data: user.user_metadata,
        });
        console.log(err, data.user?.user_metadata);
        if (err) {
          console.log("ERROR", error);
          return;
        }
        console.log("REFRESH STRAVA");
        console.log(refreshedToken);
      },
    },
    stravaToken
  );
}
