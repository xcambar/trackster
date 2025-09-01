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

    // Distance-based grade calculation for chart alignment
    const calculateGradeAtDistance = (
      targetDistanceKm: number,
      points: typeof gpxAnalysis.points,
      distanceFunc: typeof calculateDistance
    ): number => {
      const targetDistanceM = targetDistanceKm * 1000;
      
      // Find the GPS point closest to our target distance
      let cumulativeDistance = 0;
      let targetIndex = 0;
      
      for (let i = 1; i < points.length; i++) {
        const p1 = points[i - 1];
        const p2 = points[i];
        if (p1 && p2) {
          const segmentDistance = distanceFunc(p1.lat, p1.lng, p2.lat, p2.lng);
          cumulativeDistance += segmentDistance;
          
          if (cumulativeDistance >= targetDistanceM) {
            targetIndex = i;
            break;
          }
        }
      }
      
      return calculateMultiPassGrade(targetIndex, points, distanceFunc);
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
          // Calculate grade at the exact chart distance for proper alignment
          const grade = calculateGradeAtDistance(distanceKm, gpxAnalysis.points, calculateDistance);
          
          // Calculate current effort rate based on grade and accumulated fatigue
          const effortRate = calculateEffortRate(grade, distanceKm, totalEffort);
          
          // Accumulate effort over the segment distance
          const segmentDistance = lastDataPoint ? distanceKm - lastDataPoint.distance : 0;
          const segmentEffort = effortRate * segmentDistance; // Effort = rate × distance
          totalEffort += segmentEffort;

          // Debug output every 10 points to avoid spam
          if (i % 50 === 0) {
            console.log(
              `Chart point at ${distanceKm.toFixed(2)}km: elevation=${currentPoint.elevation}m, grade=${grade.toFixed(1)}% (GPS index for grade calculation), effort=${totalEffort.toFixed(1)}, rate=${effortRate.toFixed(2)}`
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
      // Uphill colors (warm tones)
      yellow: [] as Array<{ start: number; end: number }>,
      orange: [] as Array<{ start: number; end: number }>,
      red: [] as Array<{ start: number; end: number }>,
      // Downhill colors (cool tones)
      lightBlue: [] as Array<{ start: number; end: number }>,
      mediumBlue: [] as Array<{ start: number; end: number }>,
      darkBlue: [] as Array<{ start: number; end: number }>,
    };

    // Running-appropriate grade thresholds based on physiological impact
    const FLAT_THRESHOLD = 2;    // 0-2% flat/easy terrain - no coloring
    const YELLOW_THRESHOLD = 5;  // 2-5% moderate climb - noticeable effort increase
    const ORANGE_THRESHOLD = 8;  // 5-8% steep climb - significant pace reduction
    const RED_THRESHOLD = 8;     // 8%+ very steep climb - walking/power hiking required
    
    // Downhill thresholds (negative grades)
    const LIGHT_BLUE_THRESHOLD = -2;   // 0 to -2% gentle downhill
    const MEDIUM_BLUE_THRESHOLD = -5;  // -2 to -5% moderate downhill - quad impact
    const DARK_BLUE_THRESHOLD = -8;    // -5 to -8% steep downhill - significant braking
    // -8%+ very steep downhill - requires careful control
    const MIN_RANGE_LENGTH = 0.095; // Minimum ~95m range to be visible (avoids floating point issues)

    console.log(`Uphill thresholds: Flat±${FLAT_THRESHOLD}%, Yellow=${FLAT_THRESHOLD}-${YELLOW_THRESHOLD}%, Orange=${YELLOW_THRESHOLD}-${ORANGE_THRESHOLD}%, Red>${RED_THRESHOLD}%`);
    console.log(`Downhill thresholds: LightBlue=${LIGHT_BLUE_THRESHOLD} to 0%, MediumBlue=${MEDIUM_BLUE_THRESHOLD} to ${LIGHT_BLUE_THRESHOLD}%, DarkBlue<${DARK_BLUE_THRESHOLD}%`);
    
    // Debug: Check actual grade distribution including negatives
    const allGrades = elevationData.map(p => p.grade);
    const maxGrade = Math.max(...allGrades);
    const minGrade = Math.min(...allGrades);
    const avgGrade = allGrades.reduce((sum, g) => sum + g, 0) / allGrades.length;
    const gradeCount = {
      flat: allGrades.filter(g => Math.abs(g) < FLAT_THRESHOLD).length,
      yellow: allGrades.filter(g => g >= FLAT_THRESHOLD && g < YELLOW_THRESHOLD).length,
      orange: allGrades.filter(g => g >= YELLOW_THRESHOLD && g < ORANGE_THRESHOLD).length,
      red: allGrades.filter(g => g >= RED_THRESHOLD).length,
      lightBlue: allGrades.filter(g => g <= LIGHT_BLUE_THRESHOLD && g > MEDIUM_BLUE_THRESHOLD).length,
      mediumBlue: allGrades.filter(g => g <= MEDIUM_BLUE_THRESHOLD && g > DARK_BLUE_THRESHOLD).length,
      darkBlue: allGrades.filter(g => g <= DARK_BLUE_THRESHOLD).length,
    };
    console.log(`Grade stats: max=${maxGrade.toFixed(1)}%, min=${minGrade.toFixed(1)}%, avg=${avgGrade.toFixed(1)}%, counts:`, gradeCount);

    let currentRange: { type: 'yellow' | 'orange' | 'red' | 'lightBlue' | 'mediumBlue' | 'darkBlue' | null; start: number } = { type: null, start: 0 };

    for (let i = 0; i < elevationData.length; i++) {
      const point = elevationData[i];
      if (!point) continue;
      
      const grade = point.grade; // Use signed grade (not absolute)
      
      let gradeType: 'yellow' | 'orange' | 'red' | 'lightBlue' | 'mediumBlue' | 'darkBlue' | null = null;
      
      // Flat terrain (no coloring)
      if (Math.abs(grade) < FLAT_THRESHOLD) {
        gradeType = null;
      }
      // Uphill grades (positive)
      else if (grade >= FLAT_THRESHOLD && grade < YELLOW_THRESHOLD) gradeType = 'yellow';
      else if (grade >= YELLOW_THRESHOLD && grade < ORANGE_THRESHOLD) gradeType = 'orange';
      else if (grade >= RED_THRESHOLD) gradeType = 'red';
      // Downhill grades (negative)
      else if (grade <= LIGHT_BLUE_THRESHOLD && grade > MEDIUM_BLUE_THRESHOLD) gradeType = 'lightBlue';
      else if (grade <= MEDIUM_BLUE_THRESHOLD && grade > DARK_BLUE_THRESHOLD) gradeType = 'mediumBlue';
      else if (grade <= DARK_BLUE_THRESHOLD) gradeType = 'darkBlue';
      
      // Debug specific high grade points around problem areas
      if (Math.abs(point.distance - 7.4) < 0.3 || Math.abs(point.distance - 5.25) < 0.15 || Math.abs(point.distance - 5.6) < 0.1) {
        console.log(`🔍 Point ${i} at ${point.distance}km: grade=${grade.toFixed(1)}% -> type=${gradeType || 'none'}, currentRange=${currentRange.type}`);
        console.log(`    Chart data: distance=${point.distance}km, elevation=${point.elevation}m`);
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
        
        // Start new range - but back-date it to the previous interval
        // The grade at this point actually applies to the PREVIOUS interval
        const prevDistance = i > 0 && elevationData[i - 1] ? elevationData[i - 1].distance : point.distance;
        currentRange = { type: gradeType, start: prevDistance };
        if (gradeType) {
          console.log(`🟡 Starting ${gradeType} range at ${prevDistance.toFixed(2)}km (grade calculated at ${point.distance.toFixed(2)}km)`);
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
    const totalLightBlue = ranges.lightBlue.reduce((sum, r) => sum + (r.end - r.start), 0);
    const totalMediumBlue = ranges.mediumBlue.reduce((sum, r) => sum + (r.end - r.start), 0);
    const totalDarkBlue = ranges.darkBlue.reduce((sum, r) => sum + (r.end - r.start), 0);
    console.log(`Uphill lengths: Yellow=${totalYellow.toFixed(2)}km, Orange=${totalOrange.toFixed(2)}km, Red=${totalRed.toFixed(2)}km`);
    console.log(`Downhill lengths: LightBlue=${totalLightBlue.toFixed(2)}km, MediumBlue=${totalMediumBlue.toFixed(2)}km, DarkBlue=${totalDarkBlue.toFixed(2)}km`);
    
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
          {/* Uphill colors (warm tones) */}
          {gradeRanges.yellow.map((range, index) => {
            console.log(`🟨 Rendering YELLOW ReferenceArea ${index}: ${range.start}km to ${range.end}km`);
            return (
              <ReferenceArea
                key={`yellow-${index}`}
                x1={range.start}
                x2={range.end}
                fill="#FFD700"
                fillOpacity={0.35}
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
                fill="#FF8C00"
                fillOpacity={0.45}
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
                fill="#DC143C"
                fillOpacity={0.55}
              />
            );
          })}

          {/* Downhill colors (cool tones) */}
          {gradeRanges.lightBlue.map((range, index) => {
            console.log(`🟦 Rendering LIGHT BLUE ReferenceArea ${index}: ${range.start}km to ${range.end}km`);
            return (
              <ReferenceArea
                key={`lightBlue-${index}`}
                x1={range.start}
                x2={range.end}
                fill="#87CEEB"
                fillOpacity={0.35}
              />
            );
          })}
          {gradeRanges.mediumBlue.map((range, index) => {
            console.log(`🔵 Rendering MEDIUM BLUE ReferenceArea ${index}: ${range.start}km to ${range.end}km`);
            return (
              <ReferenceArea
                key={`mediumBlue-${index}`}
                x1={range.start}
                x2={range.end}
                fill="#4682B4"
                fillOpacity={0.45}
              />
            );
          })}
          {gradeRanges.darkBlue.map((range, index) => {
            console.log(`🔷 Rendering DARK BLUE ReferenceArea ${index}: ${range.start}km to ${range.end}km`);
            return (
              <ReferenceArea
                key={`darkBlue-${index}`}
                x1={range.start}
                x2={range.end}
                fill="#191970"
                fillOpacity={0.55}
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
