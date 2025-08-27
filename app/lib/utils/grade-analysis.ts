import { ActivityStreams } from "@trackster/db/schemas/activity_streams";

export interface GradeRange {
  label: string;
  min: number;
  max: number;
}

export interface GradeAnalysis {
  gradeRange: string;
  totalTimeSeconds: number;
  averagePaceMinPerKm: number;
  totalDistanceMeters: number;
}

export const GRADE_RANGES: GradeRange[] = [
  { label: "0-5%", min: 0, max: 5 },
  { label: "5-10%", min: 5, max: 10 },
  { label: "10-15%", min: 10, max: 15 },
  { label: "15-25%", min: 15, max: 25 },
  { label: ">25%", min: 25, max: Infinity },
];

export function categorizeGrade(gradePercent: number): string {
  const absGrade = Math.abs(gradePercent);

  for (const range of GRADE_RANGES) {
    if (absGrade >= range.min && absGrade < range.max) {
      return range.label;
    }
  }

  return ">25%";
}

export function calculatePaceMinPerKm(velocityMs: number): number {
  if (velocityMs <= 0) return 0;

  // Convert m/s to min/km
  // 1 km = 1000m, 1 min = 60s
  // pace = 1000 / (velocity * 60) = 1000 / (velocity * 60)
  return 1000 / velocityMs / 60;
}

export function formatPace(paceMinPerKm: number): string {
  if (paceMinPerKm === 0 || !isFinite(paceMinPerKm)) return "N/A";

  const minutes = Math.floor(paceMinPerKm);
  const seconds = Math.round((paceMinPerKm - minutes) * 60);

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function formatDistance(meters: number): string {
  const km = meters / 1000;
  return `${km.toFixed(1)} km`;
}

export function analyzeGradePerformance(
  streams: ActivityStreams[]
): GradeAnalysis[] {
  const gradeData: {
    [gradeRange: string]: { totalTime: number; totalDistance: number };
  } = {};

  // Initialize grade ranges
  GRADE_RANGES.forEach((range) => {
    gradeData[range.label] = { totalTime: 0, totalDistance: 0 };
  });

  streams.forEach((stream) => {
    const grades = stream.gradeSmoothData || [];
    const velocities = stream.velocitySmoothData || [];
    const distances = stream.distanceData || [];
    const times = stream.timeData || [];

    // Process each data point
    for (let i = 0; i < grades.length; i++) {
      const grade = grades[i];
      const velocity = velocities[i];

      if (
        grade !== null &&
        grade !== undefined &&
        velocity !== null &&
        velocity !== undefined &&
        velocity > 0
      ) {
        const gradeRange = categorizeGrade(grade);

        // Calculate time interval (assume 1 second intervals if not specified)
        const timeInterval =
          i < times.length - 1 && times[i + 1] !== null && times[i] !== null
            ? times[i + 1]! - times[i]!
            : 1;
        const distanceInterval =
          i < distances.length - 1 &&
          distances[i + 1] !== null &&
          distances[i] !== null
            ? distances[i + 1]! - distances[i]!
            : velocity * timeInterval;

        if (gradeData[gradeRange]) {
          gradeData[gradeRange].totalTime += timeInterval;
          gradeData[gradeRange].totalDistance += distanceInterval;
        }
      }
    }
  });

  // Convert to final analysis format
  return GRADE_RANGES.map((range) => {
    const data = gradeData[range.label];
    return {
      gradeRange: range.label,
      totalTimeSeconds: data?.totalTime || 0,
      averagePaceMinPerKm:
        data && data.totalDistance > 0
          ? data.totalTime / 60 / (data.totalDistance / 1000)
          : 0,
      totalDistanceMeters: data?.totalDistance || 0,
    };
  }).filter((analysis) => analysis.totalTimeSeconds > 0);
}

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffDays > 0) {
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  } else {
    return "Just now";
  }
}
