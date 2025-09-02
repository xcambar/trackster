import { Box, Card, CardContent, Typography } from "@mui/material";
import React, { useState, useCallback } from "react";
import type { GPXAnalysis } from "~/lib/gpx/parser";
import { ElevationGraph } from "./ElevationGraph.client";
import { GPXRouteMap } from "./GPXRouteMap.client";

interface GPXVisualizationProps {
  gpxAnalysis: GPXAnalysis;
}

export const GPXVisualization: React.FC<GPXVisualizationProps> = ({
  gpxAnalysis,
}) => {
  const [highlightDistance, setHighlightDistance] = useState<number | null>(
    null
  );

  const handleChartHover = useCallback((distance: number | null) => {
    console.log("GPXVisualization: Chart hover received:", distance); // Debug log
    setHighlightDistance(distance);
  }, []);

  return (
    <Box>
      {/* Route Map */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Route Map
          </Typography>
          <GPXRouteMap
            gpxAnalysis={gpxAnalysis}
            height={400}
            highlightDistance={highlightDistance}
          />
        </CardContent>
      </Card>

      {/* Elevation Profile */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Elevation Profile
          </Typography>
          <ElevationGraph
            gpxAnalysis={gpxAnalysis}
            height={300}
            onHover={handleChartHover}
          />
        </CardContent>
      </Card>
    </Box>
  );
};
