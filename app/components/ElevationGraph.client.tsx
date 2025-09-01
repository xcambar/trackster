import { Box, Card, Typography } from "@mui/material";
import React from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { GPXAnalysis } from "~/lib/gpx/parser";

interface ElevationGraphProps {
  gpxAnalysis: GPXAnalysis;
  height?: number;
  onHover?: (distance: number | null) => void;
}

interface ElevationDataPoint {
  distance: number; // km
  elevation: number; // meters
  distanceLabel: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: ElevationDataPoint;
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <Card sx={{ p: 1, bgcolor: "rgba(255, 255, 255, 0.95)" }}>
        <Typography variant="body2">Distance: {label} km</Typography>
        <Typography variant="body2" color="primary">
          Elevation: {payload[0]?.value}m
        </Typography>
      </Card>
    );
  }
  return null;
};

export const ElevationGraph: React.FC<ElevationGraphProps> = ({
  gpxAnalysis,
  height = 300,
  onHover,
}) => {
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);

  // Process GPX points to create elevation profile
  const elevationData: ElevationDataPoint[] = React.useMemo(() => {
    if (!gpxAnalysis.points || gpxAnalysis.points.length === 0) {
      return [];
    }

    const data: ElevationDataPoint[] = [];
    let cumulativeDistance = 0;

    // Helper function to calculate distance between two points
    const calculateDistance = (
      lat1: number,
      lon1: number,
      lat2: number,
      lon2: number
    ): number => {
      const R = 6371000; // Earth's radius in meters
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    // Add first point
    const firstPoint = gpxAnalysis.points[0];
    if (firstPoint && firstPoint.elevation !== undefined) {
      data.push({
        distance: 0,
        elevation: Math.round(firstPoint.elevation),
        distanceLabel: "0.0",
      });
    }

    // Process remaining points
    for (let i = 1; i < gpxAnalysis.points.length; i++) {
      const prevPoint = gpxAnalysis.points[i - 1];
      const currentPoint = gpxAnalysis.points[i];

      if (
        prevPoint &&
        currentPoint &&
        prevPoint.elevation !== undefined &&
        currentPoint.elevation !== undefined
      ) {
        // Calculate distance from previous point
        const segmentDistance = calculateDistance(
          prevPoint.lat,
          prevPoint.lng,
          currentPoint.lat,
          currentPoint.lng
        );
        cumulativeDistance += segmentDistance;

        // Sample points every ~100 meters or so to avoid too many data points
        const distanceKm = cumulativeDistance / 1000;
        const lastDataPoint = data[data.length - 1];

        if (!lastDataPoint || distanceKm - lastDataPoint.distance >= 0.1) {
          data.push({
            distance: Math.round(distanceKm * 10) / 10, // Round to 0.1 km
            elevation: Math.round(currentPoint.elevation),
            distanceLabel: (Math.round(distanceKm * 10) / 10).toFixed(1),
          });
        }
      }
    }

    return data;
  }, [gpxAnalysis.points]);

  // Effect to call onHover only when activeIndex changes
  React.useEffect(() => {
    if (activeIndex !== null && elevationData[activeIndex]) {
      const dataPoint = elevationData[activeIndex];
      console.log("Effect triggering hover with distance:", dataPoint.distance); // Debug
      onHover?.(dataPoint.distance);
    } else {
      console.log("Effect clearing hover"); // Debug
      onHover?.(null);
    }
  }, [activeIndex, elevationData, onHover]);

  if (elevationData.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: "center" }}>
        <Typography variant="body2" color="text.secondary">
          No elevation data available for this route
        </Typography>
      </Box>
    );
  }

  // Calculate elevation statistics
  const elevations = elevationData.map((d) => d.elevation);
  const minElevation = Math.min(...elevations);
  const maxElevation = Math.max(...elevations);
  const elevationRange = maxElevation - minElevation;

  // Add some padding to the Y-axis
  const yAxisMin = Math.max(0, minElevation - elevationRange * 0.1);
  const yAxisMax = maxElevation + elevationRange * 0.1;

  return (
    <Box>
      <Box sx={{ mb: 2, display: "flex", gap: 3 }}>
        <Box>
          <Typography variant="body2" color="text.secondary">
            Min Elevation
          </Typography>
          <Typography variant="body1" fontWeight="bold">
            {minElevation}m
          </Typography>
        </Box>
        <Box>
          <Typography variant="body2" color="text.secondary">
            Max Elevation
          </Typography>
          <Typography variant="body1" fontWeight="bold">
            {maxElevation}m
          </Typography>
        </Box>
        <Box>
          <Typography variant="body2" color="text.secondary">
            Elevation Range
          </Typography>
          <Typography variant="body1" fontWeight="bold">
            {elevationRange}m
          </Typography>
        </Box>
      </Box>

      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={elevationData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 20,
          }}
          onMouseMove={(state: any) => {
            if (
              state &&
              state.activeTooltipIndex !== undefined &&
              state.activeTooltipIndex !== null
            ) {
              setActiveIndex(state.activeTooltipIndex);
            }
          }}
          onMouseLeave={() => {
            console.log("Chart leave"); // Debug log
            setActiveIndex(null);
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis
            dataKey="distance"
            type="number"
            scale="linear"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(value) => `${value}km`}
            stroke="#666"
            fontSize={12}
          />
          <YAxis
            domain={[yAxisMin, yAxisMax]}
            tickFormatter={(value) => `${value}m`}
            stroke="#666"
            fontSize={12}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="elevation"
            stroke="#FF5500"
            strokeWidth={2}
            dot={false}
            activeDot={{
              r: 6,
              fill: "#FF5500",
              stroke: "#fff",
              strokeWidth: 2,
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
};
