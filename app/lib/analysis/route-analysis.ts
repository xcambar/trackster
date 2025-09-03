/**
 * Unified route analysis interface and logic
 * Consolidates GPX analysis and Activity stream analysis to eliminate code duplication
 */

import { encode } from "google-polyline";

export interface RoutePoint {
  lat: number;
  lng: number;
  elevation?: number;
  time?: Date;
  distance?: number; // cumulative distance in meters
}

export interface GradeDistribution {
  // Uphill grades (positive)
  grade0To5Km: number;
  grade5To10Km: number;
  grade10To15Km: number;
  grade15To25Km: number;
  gradeOver25Km: number;
  
  // Downhill grades (negative)
  gradeNeg5To0Km: number;
  gradeNeg10ToNeg5Km: number;
  gradeNeg15ToNeg10Km: number;
  gradeNeg25ToNeg15Km: number;
  gradeNegOver25Km: number;
}

export interface RouteAnalysis {
  name: string;
  description?: string;
  points: RoutePoint[];
  
  // Basic metrics
  totalDistance: number; // meters
  totalElevationGain: number; // meters
  totalAscent: number; // meters (total upward elevation)
  totalDescent: number; // meters (total downward elevation)
  minElevation: number; // meters
  maxElevation: number; // meters
  elevationRange: number; // meters
  polyline: string; // Google polyline encoded
  
  // Grade analysis
  gradeDistribution: GradeDistribution;
  averageGrade: number;
  maxGrade: number;
  minGrade: number;
  
  // Optional performance data (for activities with time data)
  totalTime?: number; // seconds
  movingTime?: number; // seconds
  averageSpeed?: number; // m/s
  maxSpeed?: number; // m/s
}

/**
 * Calculate distance between two GPS points using Haversine formula
 */
export function calculateDistance(point1: RoutePoint, point2: RoutePoint): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((point2.lat - point1.lat) * Math.PI) / 180;
  const dLng = ((point2.lng - point1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((point1.lat * Math.PI) / 180) *
      Math.cos((point2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate grade between two points
 */
export function calculateGrade(
  point1: RoutePoint,
  point2: RoutePoint,
  distance: number
): number {
  if (!point1.elevation || !point2.elevation || distance === 0) {
    return 0;
  }
  const elevationDiff = point2.elevation - point1.elevation;
  return (elevationDiff / distance) * 100;
}

/**
 * Analyze route points and return comprehensive analysis
 */
export function analyzeRoute(
  points: RoutePoint[],
  name: string,
  description?: string,
  polyline?: string
): RouteAnalysis {
  if (points.length === 0) {
    throw new Error("No valid route points provided");
  }

  // Calculate basic route metrics
  let totalDistance = 0;
  let totalElevationGain = 0;
  let totalAscent = 0;
  let totalDescent = 0;

  // Process each segment between consecutive points
  for (let i = 1; i < points.length; i++) {
    const prevPoint = points[i - 1];
    const currPoint = points[i];

    if (prevPoint && currPoint) {
      const distance = calculateDistance(prevPoint, currPoint);
      totalDistance += distance;

      // Calculate elevation changes
      if (currPoint.elevation !== undefined && prevPoint.elevation !== undefined) {
        const elevationDiff = currPoint.elevation - prevPoint.elevation;
        if (elevationDiff > 0) {
          totalElevationGain += elevationDiff;
          totalAscent += elevationDiff;
        } else if (elevationDiff < 0) {
          totalDescent += Math.abs(elevationDiff);
        }
      }
    }
  }

  // Calculate elevation statistics
  const elevations = points
    .map((p) => p.elevation)
    .filter((elevation): elevation is number => elevation !== undefined);

  const minElevation = elevations.length > 0 ? Math.min(...elevations) : 0;
  const maxElevation = elevations.length > 0 ? Math.max(...elevations) : 0;
  const elevationRange = maxElevation - minElevation;

  // Generate polyline if not provided
  let finalPolyline = polyline || "";
  if (!finalPolyline) {
    const polylinePoints: [number, number][] = points.map((p) => [p.lat, p.lng]);
    finalPolyline = encode(polylinePoints);
  }

  // Calculate grade distribution and statistics
  const { gradeDistribution, averageGrade, maxGrade, minGrade } = analyzeGrades(points);

  // Calculate performance metrics if time data is available
  const timeData = analyzeTimeData(points);

  return {
    name,
    description,
    points,
    totalDistance,
    totalElevationGain,
    totalAscent,
    totalDescent,
    minElevation,
    maxElevation,
    elevationRange,
    polyline: finalPolyline,
    gradeDistribution,
    averageGrade,
    maxGrade,
    minGrade,
    ...timeData,
  };
}

/**
 * Analyze grade distribution and statistics for route points
 */
function analyzeGrades(points: RoutePoint[]): {
  gradeDistribution: GradeDistribution;
  averageGrade: number;
  maxGrade: number;
  minGrade: number;
} {
  const gradeDistribution: GradeDistribution = {
    // Uphill grades
    grade0To5Km: 0,
    grade5To10Km: 0,
    grade10To15Km: 0,
    grade15To25Km: 0,
    gradeOver25Km: 0,
    
    // Downhill grades
    gradeNeg5To0Km: 0,
    gradeNeg10ToNeg5Km: 0,
    gradeNeg15ToNeg10Km: 0,
    gradeNeg25ToNeg15Km: 0,
    gradeNegOver25Km: 0,
  };

  let totalGradeSum = 0;
  let gradeCount = 0;
  let maxGrade = -Infinity;
  let minGrade = Infinity;

  // Analyze each segment between consecutive points
  for (let i = 1; i < points.length; i++) {
    const point1 = points[i - 1];
    const point2 = points[i];

    if (point1 && point2) {
      const distance = calculateDistance(point1, point2);
      const grade = calculateGrade(point1, point2, distance);

      if (distance > 0) {
        // Update grade statistics (preserve sign for min/max)
        totalGradeSum += Math.abs(grade); // Keep abs for average calculation
        gradeCount++;
        maxGrade = Math.max(maxGrade, grade);
        minGrade = Math.min(minGrade, grade);

        // Categorize grade using real values (positive and negative)
        const distanceKm = distance / 1000;

        if (grade >= 0) {
          // Uphill grades (positive)
          if (grade < 5) {
            gradeDistribution.grade0To5Km += distanceKm;
          } else if (grade < 10) {
            gradeDistribution.grade5To10Km += distanceKm;
          } else if (grade < 15) {
            gradeDistribution.grade10To15Km += distanceKm;
          } else if (grade < 25) {
            gradeDistribution.grade15To25Km += distanceKm;
          } else {
            gradeDistribution.gradeOver25Km += distanceKm;
          }
        } else {
          // Downhill grades (negative)
          if (grade >= -5) {
            gradeDistribution.gradeNeg5To0Km += distanceKm;
          } else if (grade >= -10) {
            gradeDistribution.gradeNeg10ToNeg5Km += distanceKm;
          } else if (grade >= -15) {
            gradeDistribution.gradeNeg15ToNeg10Km += distanceKm;
          } else if (grade >= -25) {
            gradeDistribution.gradeNeg25ToNeg15Km += distanceKm;
          } else {
            gradeDistribution.gradeNegOver25Km += distanceKm;
          }
        }
      }
    }
  }

  const averageGrade = gradeCount > 0 ? totalGradeSum / gradeCount : 0;

  return {
    gradeDistribution,
    averageGrade,
    maxGrade: maxGrade === -Infinity ? 0 : maxGrade,
    minGrade: minGrade === Infinity ? 0 : minGrade,
  };
}

/**
 * Analyze time-based performance data if available
 */
function analyzeTimeData(points: RoutePoint[]): {
  totalTime?: number;
  movingTime?: number;
  averageSpeed?: number;
  maxSpeed?: number;
} {
  const timePoints = points.filter(p => p.time);
  
  if (timePoints.length < 2) {
    return {};
  }

  const firstTime = timePoints[0]?.time;
  const lastTime = timePoints[timePoints.length - 1]?.time;
  
  if (!firstTime || !lastTime) {
    return {};
  }

  const totalTime = (lastTime.getTime() - firstTime.getTime()) / 1000; // seconds
  
  // Calculate speeds and moving time
  let movingTime = 0;
  let maxSpeed = 0;
  let totalMovingDistance = 0;

  for (let i = 1; i < points.length; i++) {
    const point1 = points[i - 1];
    const point2 = points[i];

    if (point1?.time && point2?.time) {
      const timeDiff = (point2.time.getTime() - point1.time.getTime()) / 1000; // seconds
      const distance = calculateDistance(point1, point2);
      
      if (timeDiff > 0 && distance > 0) {
        const speed = distance / timeDiff; // m/s
        
        // Consider moving if speed > 0.5 m/s (~1.8 km/h)
        if (speed > 0.5) {
          movingTime += timeDiff;
          totalMovingDistance += distance;
          maxSpeed = Math.max(maxSpeed, speed);
        }
      }
    }
  }

  const averageSpeed = movingTime > 0 ? totalMovingDistance / movingTime : 0;

  return {
    totalTime,
    movingTime: movingTime > 0 ? movingTime : undefined,
    averageSpeed: averageSpeed > 0 ? averageSpeed : undefined,
    maxSpeed: maxSpeed > 0 ? maxSpeed : undefined,
  };
}