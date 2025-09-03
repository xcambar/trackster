import React from "react";
import type { GPXAnalysis } from "~/lib/gpx/parser";
import { RouteVisualization } from "./RouteVisualization.client";

interface GPXVisualizationProps {
  gpxAnalysis: GPXAnalysis;
}

export const GPXVisualization: React.FC<GPXVisualizationProps> = ({
  gpxAnalysis,
}) => {
  // Use the unified RouteVisualization component
  // GPXAnalysis extends RouteAnalysis, so it's compatible
  return (
    <RouteVisualization
      analysis={gpxAnalysis}
      height={300}
      mapHeight={400}
    />
  );
};
