/**
 * Activity Analysis Service
 * Provides analyzed activity data using unified route analysis system
 */

import { User } from "@supabase/supabase-js";
import { activitiesTable, Activity } from "@xcambar/trackster-db";
import { ActivityStreams, activityStreamsTable } from "@xcambar/trackster-db/schemas/activity_streams";
import { eq, and } from "drizzle-orm";
import db from "~/services/db.server";
import { getUserFromSession } from "./user";
import { 
  ActivityWithStreams, 
  ActivityAnalysis, 
  activityToAnalysis,
  canAnalyzeActivity 
} from "../analysis/activity-adapter";

type UserSession = Awaited<ReturnType<typeof getUserFromSession>>;

/**
 * Get activity with streams for analysis
 */
export async function getActivityWithStreams(
  activityId: number,
  user: User
): Promise<ActivityWithStreams | null> {
  try {
    // Get the activity
    const activities = await db
      .select()
      .from(activitiesTable)
      .where(
        and(
          eq(activitiesTable.id, activityId),
          eq(activitiesTable.athleteId, user.user_metadata.strava_profile.id)
        )
      );

    const activity = activities[0];
    if (!activity) {
      return null;
    }

    // Get the streams if available
    const streams = await db
      .select()
      .from(activityStreamsTable)
      .where(eq(activityStreamsTable.activityId, activityId))
      .limit(1);

    return {
      activity,
      streams: streams[0] || null,
    };
  } catch (error) {
    console.error("Error fetching activity with streams:", error);
    return null;
  }
}

/**
 * Get full analysis for an activity
 */
export async function getActivityAnalysis(
  activityId: number,
  user: User
): Promise<ActivityAnalysis | null> {
  try {
    const activityWithStreams = await getActivityWithStreams(activityId, user);
    
    if (!activityWithStreams) {
      return null;
    }

    // Check if activity has sufficient data for analysis
    if (!canAnalyzeActivity(activityWithStreams)) {
      throw new Error("Activity does not have sufficient route data for analysis");
    }

    return activityToAnalysis(activityWithStreams);
  } catch (error) {
    console.error("Error analyzing activity:", error);
    throw new Response("Failed to analyze activity", { status: 500 });
  }
}

/**
 * Get multiple activities with basic analysis data for comparison
 */
export async function getActivitiesWithBasicAnalysis(
  activityIds: number[],
  user: User
): Promise<ActivityAnalysis[]> {
  if (activityIds.length === 0) {
    return [];
  }

  try {
    const results: ActivityAnalysis[] = [];

    // Process activities in batches to avoid overwhelming the database
    const batchSize = 10;
    for (let i = 0; i < activityIds.length; i += batchSize) {
      const batch = activityIds.slice(i, i + batchSize);
      const batchPromises = batch.map(id => getActivityAnalysis(id, user));
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Add successful results to our array
      batchResults.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          results.push(result.value);
        }
      });
    }

    return results;
  } catch (error) {
    console.error("Error getting activities with analysis:", error);
    throw new Response("Failed to analyze activities", { status: 500 });
  }
}

/**
 * Check if an activity can be analyzed (has sufficient route data)
 */
export async function checkActivityAnalyzable(
  activityId: number,
  user: User
): Promise<boolean> {
  try {
    const activityWithStreams = await getActivityWithStreams(activityId, user);
    return activityWithStreams ? canAnalyzeActivity(activityWithStreams) : false;
  } catch (error) {
    console.error("Error checking if activity is analyzable:", error);
    return false;
  }
}

/**
 * Get activities that can be analyzed (have route data)
 */
export async function getAnalyzableActivities(
  user: UserSession,
  limit: number = 50
): Promise<Activity[]> {
  try {
    // Get activities that have polyline data (minimum requirement for analysis)
    const activities = await db
      .select()
      .from(activitiesTable)
      .where(
        and(
          eq(activitiesTable.athleteId, user.user_metadata.strava_profile.id),
          // Only include activities with polyline data
          // Using raw SQL to check if map.polyline exists and is not empty
        )
      )
      .limit(limit);

    // Filter activities that actually have usable route data
    return activities.filter(activity => 
      activity.map?.polyline && activity.map.polyline.length > 0
    );
  } catch (error) {
    console.error("Error fetching analyzable activities:", error);
    throw new Response("Failed to fetch activities", { status: 500 });
  }
}

/**
 * Get activity summary statistics for comparison
 */
export interface ActivitySummaryStats {
  totalDistance: number;
  totalElevationGain: number;
  averageGrade: number;
  maxGrade: number;
  totalTime?: number;
  averageSpeed?: number;
}

/**
 * Get lightweight summary stats for multiple activities
 */
export async function getActivitiesSummaryStats(
  activityIds: number[],
  user: User
): Promise<Record<number, ActivitySummaryStats>> {
  const summaries: Record<number, ActivitySummaryStats> = {};

  try {
    // Process in smaller batches for better performance
    const batchSize = 5;
    for (let i = 0; i < activityIds.length; i += batchSize) {
      const batch = activityIds.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (activityId) => {
        try {
          const analysis = await getActivityAnalysis(activityId, user);
          if (analysis) {
            summaries[activityId] = {
              totalDistance: analysis.totalDistance,
              totalElevationGain: analysis.totalElevationGain,
              averageGrade: analysis.averageGrade,
              maxGrade: analysis.maxGrade,
              totalTime: analysis.totalTime,
              averageSpeed: analysis.averageSpeed,
            };
          }
        } catch (error) {
          // Skip activities that can't be analyzed
          console.warn(`Failed to analyze activity ${activityId}:`, error);
        }
      }));
    }

    return summaries;
  } catch (error) {
    console.error("Error getting activity summary stats:", error);
    return summaries; // Return partial results
  }
}