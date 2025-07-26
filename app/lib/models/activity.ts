import { ActivityType } from "strava";
import { getUserFromSession } from "./user";
import { getStravaAPIClient } from "../strava/api";
import { User } from "@supabase/supabase-js";

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
  const stravaToken = user.user_metadata.strava_profile.token;

  const strava = getStravaAPIClient(stravaToken);

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

export const getActivity = async (activityId: number, user: User) => {
  const apiClient = getStravaAPIClient(user.user_metadata.strava_profile.token);
  try {
    return await apiClient.activities.getActivityById({
      id: activityId,
      include_all_efforts: true,
    });
  } catch (error) {
    throw new Response("Internal error", {
      status: 500,
    });
  }
};
