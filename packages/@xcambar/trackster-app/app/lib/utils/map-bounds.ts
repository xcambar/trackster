import * as PolylineEncoded from "google-polyline";
import { ActivityMap } from "~/lib/types/activity";

export type MapBounds = {
  northEast: [number, number];
  southWest: [number, number];
};

/**
 * Calculate the bounding box for a set of activities with polylines
 * @param activities Array of ActivityMap objects
 * @returns MapBounds object with northEast and southWest coordinates, or null if no valid polylines
 */
export function calculateActivityBounds(activities: ActivityMap[]): MapBounds | null {
  if (activities.length === 0) {
    return null;
  }

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  let hasValidPolylines = false;

  for (const { activity } of activities) {
    if (!activity.map?.polyline) {
      continue;
    }

    try {
      // Decode the Google polyline to get array of [lat, lng] points
      const coordinates = PolylineEncoded.decode(activity.map.polyline);
      
      if (coordinates.length === 0) {
        continue;
      }

      hasValidPolylines = true;

      // Find min/max lat/lng for this polyline
      for (const [lat, lng] of coordinates) {
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
      }
    } catch (error) {
      console.warn(`Failed to decode polyline for activity ${activity.id}:`, error);
      continue;
    }
  }

  if (!hasValidPolylines) {
    return null;
  }

  // Add small padding to ensure activities aren't right at the edge
  const latPadding = (maxLat - minLat) * 0.05; // 5% padding
  const lngPadding = (maxLng - minLng) * 0.05; // 5% padding

  return {
    northEast: [maxLat + latPadding, maxLng + lngPadding],
    southWest: [minLat - latPadding, minLng - lngPadding],
  };
}

/**
 * Convert MapBounds to Leaflet bounds format
 * @param bounds MapBounds object
 * @returns Leaflet-compatible bounds array
 */
export function toBounds(bounds: MapBounds): [[number, number], [number, number]] {
  return [bounds.southWest, bounds.northEast];
}