import React from "react";
import { Polyline, Popup } from "react-leaflet";
import PolylineEncoded from "google-polyline";
import { DetailedSegmentEffort } from "strava";
import { Typography, Paper, Box, Divider } from "@mui/material";

interface SegmentPolylineProps {
  segmentEffort: DetailedSegmentEffort;
  activityPolyline: string;
  color?: string;
}

export const StravaSegmentPolyline: React.FC<SegmentPolylineProps> = ({
  segmentEffort,
  activityPolyline,
  color = "#FF6B00",
}) => {
  // Extract the segment portion from the activity polyline using start_index and end_index
  const activityCoords = PolylineEncoded.decode(activityPolyline);
  const segmentCoords = activityCoords.slice(
    segmentEffort.start_index,
    segmentEffort.end_index + 1
  );

  const eventHandlers = {
    mouseover: (event: any) => {
      event.target.openPopup();
    },
    mouseout: (event: any) => {
      event.target.closePopup();
    },
  };

  return (
    <Polyline
      positions={segmentCoords}
      color={color}
      weight={6}
      opacity={0.8}
      eventHandlers={eventHandlers}
    >
      <Popup closeButton={false} autoClose={false} autoPan={false}>
        <Box sx={{ minWidth: 180 }}>
          <Typography variant="body2" fontWeight="medium" color="text.primary" sx={{ mb: 1 }}>
            {segmentEffort.name}
          </Typography>
          <Divider sx={{ mb: 1 }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Distance: {(segmentEffort.distance / 1000).toFixed(2)} km
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Time: {Math.floor(segmentEffort.elapsed_time / 60)}:{(segmentEffort.elapsed_time % 60).toString().padStart(2, '0')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Pace: {((segmentEffort.elapsed_time / 60) / (segmentEffort.distance / 1000)).toFixed(1)} min/km
            </Typography>
          </Box>
        </Box>
      </Popup>
    </Polyline>
  );
};
