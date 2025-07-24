import { ActivityType, Strava } from "strava";
import { getUserFromSession } from "./user";
import { getEnvironment } from "lib/environment";

export type Activity = {
  type: Lowercase<ActivityType>;
  title: string;
  id: number;
  start_date: string;
  distance: number;
};

type UserSession = Awaited<ReturnType<typeof getUserFromSession>>;

export const getActivitiesForUser = async (
  user: UserSession
): Promise<Activity[]> => {
  const stravaToken = user.user_metadata.strava_profile;

  const strava = new Strava(
    {
      client_id: getEnvironment("STRAVA_CLIENT_ID"),
      client_secret: getEnvironment("STRAVA_CLIENT_SECRET"),
      on_token_refresh: (response) => {
        /**
         * @todo Improve on token refresh
         */
        console.log("REFRESH STRAVA");
        console.log(response);
      },
    },
    stravaToken.token
  );

  try {
    const activities = await strava.activities.getLoggedInAthleteActivities();
    return activities.map(({ id, type, start_date, name, distance }) => {
      const t = type.toLowerCase() as Lowercase<ActivityType>;
      return { id, type: t, start_date, title: name, distance };
    });
  } catch (error) {
    throw new Response("Internal error", {
      status: 500,
    });
  }
};
