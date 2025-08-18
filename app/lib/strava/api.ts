import { AccessToken, Strava } from "strava";
import { supabase } from "~/services/supabase.server";
import { getEnvironment } from "@trackster/env";

export function getStravaAPIClient(stravaToken: AccessToken) {
  return new Strava(
    {
      client_id: getEnvironment("STRAVA_CLIENT_ID"),
      client_secret: getEnvironment("STRAVA_CLIENT_SECRET"),
      on_token_refresh: async (refreshedToken) => {
        /**
         * @todo Improve on token refresh
         */
        console.log("Strava API token is deprecated. Refreshing.");
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();
        if (!user || error) {
          console.log(
            "Could not find database user. Updating in memory only.",
            error?.message
          );
          return;
        }
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
