import React from "react";
import { useMap } from "react-leaflet";
import { ActivityMap } from "~/lib/types/activity";
import { calculateActivityBounds, toBounds } from "~/lib/utils/map-bounds";

interface MapActivityBoundsUpdaterProps {
  activities: ActivityMap[];
}

export const MapActivityBoundsUpdater: React.FC<
  MapActivityBoundsUpdaterProps
> = ({ activities }) => {
  const map = useMap();
  const [previousActivityIds, setPreviousActivityIds] = React.useState<
    number[]
  >([]);

  React.useEffect(() => {
    // Get current activity IDs for comparison
    const currentActivityIds = activities
      .map((activity) => activity.activity.id)
      .sort();
    const previousIds = [...previousActivityIds].sort();

    // Only update bounds if activities have changed
    const activitiesChanged =
      currentActivityIds.length !== previousIds.length ||
      !currentActivityIds.every((id, index) => id === previousIds[index]);

    if (!activitiesChanged) {
      return;
    }

    // Update our tracking of activity IDs
    setPreviousActivityIds(currentActivityIds);

    if (activities.length === 0) {
      // No activities selected - don't change map bounds, let geolocation take over
      return;
    }

    const bounds = calculateActivityBounds(activities);
    if (!bounds) {
      // No valid polylines found
      console.warn("No valid polylines found for selected activities");
      return;
    }

    // Fit map to show all selected activities
    try {
      map.flyToBounds(toBounds(bounds), {
        padding: [20, 20], // Add 20px padding on all sides
        maxZoom: 16, // Prevent zooming in too much for very short routes
        animate: true, // Smooth animation to new bounds
        duration: 1.0, // 1 second animation
      });
    } catch (error) {
      console.error("Failed to fit bounds:", error);
    }
  }, [activities, map, previousActivityIds]);

  return null; // This component doesn't render anything
};
