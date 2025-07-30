import { getUserFromSession } from "./user";
import { User } from "@supabase/supabase-js";
import db from "~/services/db.server";
import { activitiesTable, Activity } from "db/schema";
import { and, eq } from "drizzle-orm";

type UserSession = Awaited<ReturnType<typeof getUserFromSession>>;

export const getActivitiesForUser = async (
  user: UserSession
): Promise<Activity[]> => {
  try {
    const activities = await db
      .select()
      .from(activitiesTable)
      .where(
        eq(activitiesTable.athleteId, user.user_metadata.strava_profile.id)
      );

    return activities;
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
