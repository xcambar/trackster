import { Box, Card, CardContent, Typography } from "@mui/material";
import React, { useState, useCallback } from "react";
import type { RouteAnalysis } from "~/lib/analysis/route-analysis";
import type { ActivityAnalysis } from "~/lib/analysis/activity-adapter";
import { ElevationGraph } from "./ElevationGraph.client";
import { RouteMap } from "./RouteMap.client";

interface RouteVisualizationProps {
  analysis: RouteAnalysis | ActivityAnalysis;
  height?: number;
  mapHeight?: number;
}

export const RouteVisualization: React.FC<RouteVisualizationProps> = ({
  analysis,
  height = 300,
  mapHeight = 400,
}) => {
  const [highlightDistance, setHighlightDistance] = useState<number | null>(
    null
  );

  const handleChartHover = useCallback((distance: number | null) => {
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
          <RouteMap
            analysis={analysis}
            height={mapHeight}
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
            analysis={analysis}
            height={height}
            onHover={handleChartHover}
          />
        </CardContent>
      </Card>
    </Box>
  );
};