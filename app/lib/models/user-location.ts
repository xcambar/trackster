import type { User } from "@supabase/supabase-js";
import { and, eq, isNotNull } from "drizzle-orm";
import { activitiesTable } from "@trackster/db/schemas/activities";
import db from "../../services/db.server";

export interface UserLocation {
  lat: number;
  lng: number;
  count: number;
}

/**
 * Get the most frequently used starting location from user's running activities
 * Groups nearby locations (within ~200m) together and returns the most common one
 */
export async function getMostCommonStartingLocation(
  user: User
): Promise<UserLocation | null> {
  try {
    // Get all running activities with start locations for this user
    const activities = await db
      .select({
        startLatlng: activitiesTable.startLatlng,
      })
      .from(activitiesTable)
      .where(
        and(
          eq(activitiesTable.athleteId, user.user_metadata.strava_profile.id),
          eq(activitiesTable.sportType, "Run"),
          isNotNull(activitiesTable.startLatlng)
        )
      )
      .limit(200); // Limit for performance

    if (activities.length === 0) {
      return null;
    }

    // Extract valid coordinates
    const coordinates = activities
      .map((activity) => activity.startLatlng)
      .filter(
        (coords): coords is [number, number] =>
          coords !== null && Array.isArray(coords) && coords.length === 2
      )
      .map(([lat, lng]) => ({ lat, lng }));

    if (coordinates.length === 0) {
      return null;
    }

    // Group nearby coordinates (within ~200m radius)
    const CLUSTERING_THRESHOLD = 0.002; // Roughly 200m in degrees
    const clusters: Array<{
      lat: number;
      lng: number;
      count: number;
      coords: Array<{ lat: number; lng: number }>;
    }> = [];

    for (const coord of coordinates) {
      // Find existing cluster within threshold
      let foundCluster = false;
      for (const cluster of clusters) {
        const distance = Math.sqrt(
          Math.pow(cluster.lat - coord.lat, 2) +
            Math.pow(cluster.lng - coord.lng, 2)
        );

        if (distance <= CLUSTERING_THRESHOLD) {
          cluster.coords.push(coord);
          cluster.count++;
          // Update cluster center to average of all points
          const sumLat = cluster.coords.reduce((sum, c) => sum + c.lat, 0);
          const sumLng = cluster.coords.reduce((sum, c) => sum + c.lng, 0);
          cluster.lat = sumLat / cluster.coords.length;
          cluster.lng = sumLng / cluster.coords.length;
          foundCluster = true;
          break;
        }
      }

      // Create new cluster if no existing one found
      if (!foundCluster) {
        clusters.push({
          lat: coord.lat,
          lng: coord.lng,
          count: 1,
          coords: [coord],
        });
      }
    }

    // Sort clusters by frequency and return the most common one
    clusters.sort((a, b) => b.count - a.count);

    if (clusters.length > 0) {
      const mostCommon = clusters[0];
      return {
        lat: mostCommon.lat,
        lng: mostCommon.lng,
        count: mostCommon.count,
      };
    }

    return null;
  } catch (error) {
    console.error("Error finding most common starting location:", error);
    return null;
  }
}

/**
 * Get default location if no user activities are available
 * Returns Freiburg city center as fallback
 */
export function getDefaultLocation(): UserLocation {
  return {
    lat: 47.9959,
    lng: 7.8522,
    count: 0,
  };
}
