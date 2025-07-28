import { ActivityType } from "strava";
import { getUserFromSession } from "./user";
import { User } from "@supabase/supabase-js";
import db from "~/services/db.server";
import { activitiesTable } from "db/schema";
import { and, eq } from "drizzle-orm";

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
  const activities = await db
    .select()
    .from(activitiesTable)
    .where(eq(activitiesTable.athleteId, user.user_metadata.strava_profile.id));

  try {
    return activities.map(
      ({ id, sportType, /*start_date,*/ name, distance }) => {
        const t = sportType?.toLowerCase() as Lowercase<ActivityType>;
        return {
          id,
          type: t,
          start_date: new Date().toISOString(),
          title: name,
          distance,
        };
      }
    );
  } catch (error) {
    throw new Response("Internal error", {
      status: 500,
    });
  }
};

export const getActivity = async (activityId: number, user: User) => {
  try {
    return (
      await db
        .select()
        .from(activitiesTable)
        .where(
          and(
            eq(activitiesTable.id, activityId),
            eq(activitiesTable.athleteId, user.user_metadata.strava_profile.id)
          )
        )
    )[0];
  } catch (error) {
    throw new Response("Internal error", {
      status: 500,
    });
  }
};
