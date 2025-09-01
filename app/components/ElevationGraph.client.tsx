import { Box, Card, Typography } from "@mui/material";
import React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceArea,
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
  grade: number; // percentage
  effort: number; // accumulated effort score
  effortRate: number; // effort expenditure rate at this point
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
        <Typography variant="body2" color="primary">
          Grade: {payload[0]?.payload.grade}%
        </Typography>
        <Typography variant="body2" color="secondary">
          Effort: {payload[0]?.payload.effort}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Effort Rate: {payload[0]?.payload.effortRate}x
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

    // Multi-pass grade smoothing algorithm to eliminate terrain discontinuities
    const calculateMultiPassGrade = (
      currentIndex: number,
      points: typeof gpxAnalysis.points,
      distanceFunc: typeof calculateDistance
    ): number => {
      if (currentIndex < 1 || !points[currentIndex] || points[currentIndex]?.elevation === undefined) {
        return 0;
      }

      // Progressive window sizes for multi-pass smoothing
      const windowSizes = [50, 100, 200, 500, 1000]; // meters
      const weights = [0.2, 0.3, 0.3, 0.15, 0.05]; // More balanced smoothing (less local emphasis)
      const MIN_ELEVATION_CHANGE = 1.5; // Ignore elevation changes < 1.5m (GPS noise)
      
      const currentPoint = points[currentIndex];
      let weightedGradeSum = 0;
      let totalWeight = 0;

      // Multi-pass calculation with different window sizes
      for (let pass = 0; pass < windowSizes.length; pass++) {
        const windowSize = windowSizes[pass];
        const weight = weights[pass];
        
        let totalDistance = 0;
        let startIndex = currentIndex;

        // Find start of current window
        for (let i = currentIndex - 1; i >= 0; i--) {
          const p1 = points[i];
          const p2 = points[i + 1];
          
          if (!p1 || !p2) continue;
          
          const segmentDistance = distanceFunc(p1.lat, p1.lng, p2.lat, p2.lng);
          totalDistance += segmentDistance;
          
          if (totalDistance >= windowSize) {
            startIndex = i;
            break;
          }
        }

        const startPoint = points[startIndex];
        if (!startPoint || startPoint.elevation === undefined || currentPoint?.elevation === undefined) {
          continue;
        }

        const elevationDiff = currentPoint.elevation - startPoint.elevation;
        
        // Skip this pass if elevation change is too small for this window size
        const elevationThreshold = Math.max(MIN_ELEVATION_CHANGE, windowSize / 500); // Adaptive threshold
        if (Math.abs(elevationDiff) < elevationThreshold) {
          continue;
        }

        // Calculate grade for this pass
        if (totalDistance > 0) {
          const passGrade = (elevationDiff / totalDistance) * 100;
          weightedGradeSum += passGrade * weight;
          totalWeight += weight;
        }
      }

      // Return weighted average of all valid passes
      const finalGrade = totalWeight > 0 ? weightedGradeSum / totalWeight : 0;
      
      // Debug output for key points to show multi-pass working
      if (currentIndex % 100 === 0 && totalWeight > 0) {
        console.log(`Multi-pass grade at index ${currentIndex}: ${finalGrade.toFixed(2)}% (from ${Math.round(totalWeight * 100)}% of passes)`);
      }
      
      return finalGrade;
    };

    // Calculate effort expenditure rate based on grade and accumulated fatigue
    const calculateEffortRate = (
      grade: number,
      distance: number,
      accumulatedEffort: number
    ): number => {
      // Base effort from grade (using power law similar to running physiology)
      const absGrade = Math.abs(grade);
      const baseEffort = 1 + Math.pow(absGrade / 100, 1.5) * 8; // 1 = flat, exponential increase with grade
      
      // Fatigue multiplier based on accumulated effort
      const fatigueMultiplier = 1 + (accumulatedEffort / 100) * 0.2; // 20% harder per 100 effort units
      
      // Distance fatigue (later in route = harder)
      const distanceFatigue = 1 + (distance / 10) * 0.1; // 10% harder per 10km
      
      return baseEffort * fatigueMultiplier * distanceFatigue;
    };

    // Initialize accumulated effort tracking
    let totalEffort = 0;
    
    // Add first point
    const firstPoint = gpxAnalysis.points[0];
    if (firstPoint && firstPoint.elevation !== undefined) {
      data.push({
        distance: 0,
        elevation: Math.round(firstPoint.elevation),
        distanceLabel: "0.0",
        grade: 0, // First point has no grade
        effort: 0, // First point has no accumulated effort
        effortRate: 1, // Base effort rate for flat terrain
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
          // Calculate grade using multi-pass smoothing algorithm
          const grade = calculateMultiPassGrade(i, gpxAnalysis.points, calculateDistance);
          
          // Calculate current effort rate based on grade and accumulated fatigue
          const effortRate = calculateEffortRate(grade, distanceKm, totalEffort);
          
          // Accumulate effort over the segment distance
          const segmentDistance = lastDataPoint ? distanceKm - lastDataPoint.distance : 0;
          const segmentEffort = effortRate * segmentDistance; // Effort = rate × distance
          totalEffort += segmentEffort;

          // Debug output every 10 points to avoid spam
          if (i % 50 === 0) {
            console.log(
              `Point ${i}: distance=${distanceKm.toFixed(2)}km, elevation=${currentPoint.elevation}m, grade=${grade.toFixed(1)}%, effort=${totalEffort.toFixed(1)}, rate=${effortRate.toFixed(2)}`
            );
          }

          data.push({
            distance: Math.round(distanceKm * 10) / 10, // Round to 0.1 km
            elevation: Math.round(currentPoint.elevation),
            distanceLabel: (Math.round(distanceKm * 10) / 10).toFixed(1),
            grade: Math.round(grade * 10) / 10, // Round to 0.1%
            effort: Math.round(totalEffort * 10) / 10, // Round to 0.1
            effortRate: Math.round(effortRate * 100) / 100, // Round to 0.01
          });
        }
      }
    }

    return data;
  }, [gpxAnalysis]);

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

  // Create grade ranges using multi-pass calculated grades
  const gradeRanges = React.useMemo(() => {
    const ranges = {
      yellow: [] as Array<{ start: number; end: number }>,
      orange: [] as Array<{ start: number; end: number }>,
      red: [] as Array<{ start: number; end: number }>,
    };

    // Use more sensitive grade thresholds to capture climbing sections
    const YELLOW_THRESHOLD = 3; // 3-6% moderate climb
    const ORANGE_THRESHOLD = 6; // 6-10% steep climb  
    const RED_THRESHOLD = 10;   // 10%+ very steep climb
    const MIN_RANGE_LENGTH = 0.05; // Minimum 50m range to be visible

    console.log(`Grade thresholds: Yellow>${YELLOW_THRESHOLD}%, Orange>${ORANGE_THRESHOLD}%, Red>${RED_THRESHOLD}%`);
    
    // Debug: Check actual grade distribution
    const grades = elevationData.map(p => Math.abs(p.grade)).filter(g => g > 0);
    const maxGrade = Math.max(...grades);
    const avgGrade = grades.reduce((sum, g) => sum + g, 0) / grades.length;
    const gradeCount = {
      yellow: grades.filter(g => g >= YELLOW_THRESHOLD && g < ORANGE_THRESHOLD).length,
      orange: grades.filter(g => g >= ORANGE_THRESHOLD && g < RED_THRESHOLD).length,
      red: grades.filter(g => g >= RED_THRESHOLD).length,
    };
    console.log(`Grade stats: max=${maxGrade.toFixed(1)}%, avg=${avgGrade.toFixed(1)}%, counts:`, gradeCount);

    let currentRange: { type: 'yellow' | 'orange' | 'red' | null; start: number } = { type: null, start: 0 };

    for (let i = 0; i < elevationData.length; i++) {
      const point = elevationData[i];
      if (!point) continue;
      
      const absGrade = Math.abs(point.grade);
      
      let gradeType: 'yellow' | 'orange' | 'red' | null = null;
      if (absGrade >= YELLOW_THRESHOLD && absGrade < ORANGE_THRESHOLD) gradeType = 'yellow';
      else if (absGrade >= ORANGE_THRESHOLD && absGrade < RED_THRESHOLD) gradeType = 'orange';
      else if (absGrade >= RED_THRESHOLD) gradeType = 'red';
      
      // Debug specific high grade points around 7.4km
      if (Math.abs(point.distance - 7.4) < 0.3) {
        console.log(`🔍 Point ${i} at ${point.distance}km: grade=${absGrade.toFixed(1)}% -> type=${gradeType || 'none'}, currentRange=${currentRange.type}`);
      }

      if (gradeType !== currentRange.type) {
        // End current range if it exists
        if (currentRange.type) {
          // Use current point's distance as the end of the previous range
          const rangeLength = point.distance - currentRange.start;
          
          // Only add ranges that are long enough to be visible
          if (rangeLength >= MIN_RANGE_LENGTH) {
            ranges[currentRange.type].push({
              start: currentRange.start,
              end: point.distance,
            });
            console.log(`📏 Adding ${currentRange.type} range: ${currentRange.start.toFixed(2)}km - ${point.distance.toFixed(2)}km (length: ${rangeLength.toFixed(3)}km)`);
          } else {
            console.log(`❌ Skipping tiny ${currentRange.type} range: ${currentRange.start.toFixed(2)}km - ${point.distance.toFixed(2)}km (length: ${rangeLength.toFixed(3)}km < ${MIN_RANGE_LENGTH}km)`);
          }
        }
        // Start new range
        currentRange = { type: gradeType, start: point.distance };
        if (gradeType) {
          console.log(`🟡 Starting ${gradeType} range at ${point.distance.toFixed(2)}km`);
        }
      }
    }

    // Close final range if exists
    if (currentRange.type && elevationData.length > 0) {
      const lastPoint = elevationData[elevationData.length - 1];
      if (lastPoint) {
        const rangeLength = lastPoint.distance - currentRange.start;
        if (rangeLength >= MIN_RANGE_LENGTH) {
          ranges[currentRange.type].push({
            start: currentRange.start,
            end: lastPoint.distance,
          });
          console.log(`📏 Closing final ${currentRange.type} range: ${currentRange.start.toFixed(2)}km - ${lastPoint.distance.toFixed(2)}km (length: ${rangeLength.toFixed(3)}km)`);
        } else {
          console.log(`❌ Skipping tiny final ${currentRange.type} range: ${currentRange.start.toFixed(2)}km - ${lastPoint.distance.toFixed(2)}km (length: ${rangeLength.toFixed(3)}km < ${MIN_RANGE_LENGTH}km)`);
        }
      }
    }

    console.log("Grade ranges:", ranges);
    
    // Debug: Show total length of colored ranges
    const totalYellow = ranges.yellow.reduce((sum, r) => sum + (r.end - r.start), 0);
    const totalOrange = ranges.orange.reduce((sum, r) => sum + (r.end - r.start), 0);
    const totalRed = ranges.red.reduce((sum, r) => sum + (r.end - r.start), 0);
    console.log(`Range lengths: Yellow=${totalYellow.toFixed(2)}km, Orange=${totalOrange.toFixed(2)}km, Red=${totalRed.toFixed(2)}km`);
    
    return ranges;
  }, [elevationData]);

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
        <AreaChart
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
              state.activeTooltipIndex !== null &&
              typeof state.activeTooltipIndex === 'number'
            ) {
              setActiveIndex(state.activeTooltipIndex);
            }
          }}
          onMouseLeave={() => {
            console.log("Chart leave"); // Debug log
            setActiveIndex(null);
          }}
        >
          <defs>
            {/* Base gradient - transparent for flat areas */}
            <linearGradient id="gradeBase" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(0,0,0,0)" stopOpacity={0} />
              <stop offset="100%" stopColor="rgba(0,0,0,0)" stopOpacity={0} />
            </linearGradient>
          </defs>
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

          {/* Grade range backgrounds */}
          {gradeRanges.yellow.map((range, index) => {
            console.log(`🟨 Rendering YELLOW ReferenceArea ${index}: ${range.start}km to ${range.end}km`);
            return (
              <ReferenceArea
                key={`yellow-${index}`}
                x1={range.start}
                x2={range.end}
                fill="#FFFF00"
                fillOpacity={0.3}
              />
            );
          })}
          {gradeRanges.orange.map((range, index) => {
            console.log(`🟧 Rendering ORANGE ReferenceArea ${index}: ${range.start}km to ${range.end}km`);
            return (
              <ReferenceArea
                key={`orange-${index}`}
                x1={range.start}
                x2={range.end}
                fill="#FFA500"
                fillOpacity={0.4}
              />
            );
          })}
          {gradeRanges.red.map((range, index) => {
            console.log(`🟥 Rendering RED ReferenceArea ${index}: ${range.start}km to ${range.end}km`);
            return (
              <ReferenceArea
                key={`red-${index}`}
                x1={range.start}
                x2={range.end}
                fill="#FF0000"
                fillOpacity={0.5}
              />
            );
          })}

          {/* Base elevation area */}
          <Area
            type="monotone"
            dataKey="elevation"
            stroke="transparent"
            strokeWidth={0}
            fill="url(#gradeBase)"
            fillOpacity={1}
            dot={false}
          />

          {/* Main elevation line */}
          <Area
            type="monotone"
            dataKey="elevation"
            stroke="#FF5500"
            strokeWidth={2}
            fill="transparent"
            dot={false}
            activeDot={{
              r: 6,
              fill: "#FF5500",
              stroke: "#fff",
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );
};
