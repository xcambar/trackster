import { getUserFromSession } from "./user";
import { User } from "@supabase/supabase-js";
import db from "~/services/db.server";
import { activitiesTable, Activity } from "db/schema";
import { activityStreamsTable, ActivityStreams } from "db/schemas/activity_streams";
import { athletePerformanceProfilesTable, AthletePerformanceProfile } from "db/schemas/athlete_performance_profiles";
import { and, eq, desc, gte, lte, sql } from "drizzle-orm";

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

export const getLastActivityForUser = async (
  user: UserSession
): Promise<Activity | null> => {
  try {
    const activities = await db
      .select()
      .from(activitiesTable)
      .where(
        eq(activitiesTable.athleteId, user.user_metadata.strava_profile.id)
      )
      .orderBy(desc(activitiesTable.startDate))
      .limit(1);

    return activities[0] || null;
  } catch (error) {
    throw new Response("Internal error", {
      status: 500,
    });
  }
};

export const getActivityStreamsForUser = async (
  user: UserSession
): Promise<ActivityStreams[]> => {
  try {
    const streams = await db
      .select()
      .from(activityStreamsTable)
      .where(eq(activityStreamsTable.athleteId, user.user_metadata.strava_profile.id));

    return streams;
  } catch (error) {
    throw new Response("Internal error", {
      status: 500,
    });
  }
};

export const getAthletePerformanceProfile = async (
  user: UserSession
): Promise<AthletePerformanceProfile | null> => {
  try {
    const profiles = await db
      .select()
      .from(athletePerformanceProfilesTable)
      .where(eq(athletePerformanceProfilesTable.athleteId, user.user_metadata.strava_profile.id))
      .limit(1);

    return profiles[0] || null;
  } catch (error) {
    throw new Response("Internal error", {
      status: 500,
    });
  }
};

export interface PersonalBest {
  distance: number; // in meters
  timeMinutes: number;
  activity: Activity;
}

export const getPersonalBests = async (
  user: UserSession
): Promise<{ [distance: string]: PersonalBest | null }> => {
  try {
    const distances = [
      { name: "5k", meters: 5000, tolerance: 200 }, // 4.8km - 5.2km
      { name: "10k", meters: 10000, tolerance: 500 }, // 9.5km - 10.5km
      { name: "halfMarathon", meters: 21097, tolerance: 500 }, // ~20.6km - 21.6km
      { name: "marathon", meters: 42195, tolerance: 1000 }, // ~41.2km - 43.2km
    ];

    const personalBests: { [distance: string]: PersonalBest | null } = {};

    for (const { name, meters, tolerance } of distances) {
      const activities = await db
        .select()
        .from(activitiesTable)
        .where(
          and(
            eq(activitiesTable.athleteId, user.user_metadata.strava_profile.id),
            gte(activitiesTable.distance, meters - tolerance),
            lte(activitiesTable.distance, meters + tolerance),
            sql`${activitiesTable.movingTime} IS NOT NULL`,
            sql`${activitiesTable.movingTime} > 0`,
            eq(activitiesTable.sportType, "Run")
          )
        )
        .orderBy(sql`${activitiesTable.movingTime} ASC`)
        .limit(1);

      if (activities[0]) {
        personalBests[name] = {
          distance: activities[0].distance,
          timeMinutes: activities[0].movingTime! / 60,
          activity: activities[0],
        };
      } else {
        personalBests[name] = null;
      }
    }

    return personalBests;
  } catch (error) {
    throw new Response("Internal error", {
      status: 500,
    });
  }
};
