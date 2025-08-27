import { getEnvironment } from "@trackster/env";
import { AthletePerformanceProfile } from "@trackster/db/schemas/athlete_performance_profiles";

export interface RoundTripRequest {
  /** Starting point latitude */
  startLat: number;
  /** Starting point longitude */
  startLng: number;
  /** Distance of round trip in meters */
  distanceMeters: number;
  /** Optional random seed for reproducible routes */
  seed?: number;
  /** Optional preferred heading in degrees (0=north, 90=east) */
  heading?: number;
  /** Whether to prefer trails (uses 'hike' profile instead of 'foot') */
  preferTrails?: boolean;
}

export interface RoundTripResponse {
  /** Total distance in meters */
  distance: number;
  /** Total time in milliseconds (from GraphHopper) */
  time: number;
  /** Total elevation gain in meters */
  elevationGain: number;
  /** Encoded polyline */
  polyline: string;
  /** Elevation profile points [distance_from_start, elevation] */
  elevationProfile: Array<[number, number]>;
  /** Turn-by-turn instructions */
  instructions: Array<{
    text: string;
    distance: number;
    time: number;
    interval: [number, number];
  }>;
}

export interface AthleteTimeEstimation {
  /** Estimated total time in minutes based on athlete profile */
  estimatedTimeMinutes: number;
  /** Average pace in min/km */
  averagePaceMinPerKm: number;
  /** Grade distribution analysis */
  gradeAnalysis: {
    flatKm: number;
    hillKm: number;
    steepKm: number;
  };
  /** Confidence level of the estimation (0-1) */
  confidence: number;
}

export interface GraphHopperRouteResponse {
  paths: Array<{
    distance: number;
    time: number;
    ascend: number;
    descend: number;
    points: string;
    instructions: Array<{
      text: string;
      distance: number;
      time: number;
      interval: [number, number];
    }>;
    details?: {
      elevation?: Array<[number, number, number]>;
      road_class?: Array<[number, number, string]>;
      surface?: Array<[number, number, string]>;
    };
  }>;
  info: {
    copyrights: string[];
    took: number;
  };
}

/**
 * Extract elevation profile from GraphHopper elevation details
 */
function extractElevationProfile(
  elevationDetails?: Array<[number, number, number]>
): Array<[number, number]> {
  if (!elevationDetails) return [];

  return elevationDetails.map(([fromIndex, toIndex, elevation]) => {
    // Use the midpoint of the segment as distance reference
    const distanceRatio = (fromIndex + toIndex) / 200; // Assuming 100 points in polyline
    return [distanceRatio, elevation];
  });
}

/**
 * Calculate elevation gain from elevation profile
 */
function calculateElevationGain(
  elevationProfile: Array<[number, number]>
): number {
  let totalGain = 0;

  for (let i = 1; i < elevationProfile.length; i++) {
    const elevationDiff = elevationProfile[i][1] - elevationProfile[i - 1][1];
    if (elevationDiff > 0) {
      totalGain += elevationDiff;
    }
  }

  return totalGain;
}

/**
 * Generate round trip route using GraphHopper API with POST request
 */
export async function generateRoundTrip(
  request: RoundTripRequest
): Promise<RoundTripResponse> {
  const baseUrl = getEnvironment("GRAPHHOPPER_BASE_URL");
  const apiKey = getEnvironment("GRAPHHOPPER_API_KEY");

  const params = new URLSearchParams({
    elevation: "true",
    instructions: "true",
    points_encoded: "true",
    calc_points: "true",
    ...(apiKey && { key: apiKey }),
  });

  // Choose profile based on trail preference
  const profile = request.preferTrails ? "hike" : "foot";

  // POST request body with points in [longitude, latitude] format
  const requestBody = {
    points: [[request.startLng, request.startLat]], // Single point for round trip
    profile: profile,
    algorithm: "round_trip",
    "round_trip.distance": request.distanceMeters,
    elevation: true,
    instructions: true,
    points_encoded: true,
    calc_points: true,
    ...(request.seed !== undefined && { "round_trip.seed": request.seed }),
    ...(request.heading !== undefined && { heading: request.heading }),
  };

  const url = `${baseUrl.replace(/\/$/, "")}/route?${params.toString()}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GraphHopper API error: ${response.status} ${errorText}`);
  }

  const data: GraphHopperRouteResponse = await response.json();

  if (!data.paths || data.paths.length === 0) {
    throw new Error("No round trip route found");
  }

  const path = data.paths[0];
  if (!path) {
    throw new Error("No path in response");
  }

  const elevationProfile = extractElevationProfile(path.details?.elevation);
  const elevationGain = path.ascend || calculateElevationGain(elevationProfile);

  return {
    distance: path.distance,
    time: path.time,
    elevationGain,
    polyline: path.points,
    elevationProfile,
    instructions: path.instructions,
  };
}

/**
 * Estimate completion time based on athlete performance profile
 */
export function estimateAthleteTime(
  route: RoundTripResponse,
  athleteProfile: AthletePerformanceProfile
): AthleteTimeEstimation {
  const distanceKm = route.distance / 1000;

  // Simple grade analysis based on elevation gain
  const avgGrade = (route.elevationGain / route.distance) * 100;

  let gradeAnalysis = {
    flatKm: distanceKm,
    hillKm: 0,
    steepKm: 0,
  };

  // Rough categorization based on average grade
  if (avgGrade > 8) {
    gradeAnalysis = { flatKm: 0, hillKm: 0, steepKm: distanceKm };
  } else if (avgGrade > 4) {
    gradeAnalysis = { flatKm: 0, hillKm: distanceKm, steepKm: 0 };
  }

  // Base pace estimation from athlete's performance
  let basePaceMinPerKm = 5.0; // Default fallback
  let confidence = 0.3; // Low confidence without data

  // Use athlete's 10K pace as baseline if available
  if (athleteProfile.avgPace10k) {
    basePaceMinPerKm = athleteProfile.avgPace10k;
    confidence = 0.7;
  } else if (athleteProfile.avgPace5k) {
    // Adjust 5K pace for longer distance (typically 5-10% slower)
    basePaceMinPerKm = athleteProfile.avgPace5k * 1.075;
    confidence = 0.6;
  } else if (athleteProfile.speedGrade0To5) {
    // Convert speed (m/s) to pace (min/km)
    basePaceMinPerKm = 1000 / (athleteProfile.speedGrade0To5 * 60);
    confidence = 0.5;
  }

  // Apply distance degradation
  const degradationFactor = athleteProfile.paceDegradationPerKm || 0.002;
  const distanceAdjustment = 1 + degradationFactor * distanceKm;

  // Apply elevation adjustment
  const elevationEfficiency = athleteProfile.elevationEfficiencyFactor || 1.0;
  const elevationAdjustment = 1 + avgGrade * 0.01 * elevationEfficiency;

  // Calculate final pace
  const adjustedPaceMinPerKm =
    basePaceMinPerKm * distanceAdjustment * elevationAdjustment;
  const estimatedTimeMinutes = adjustedPaceMinPerKm * distanceKm;

  return {
    estimatedTimeMinutes,
    averagePaceMinPerKm: adjustedPaceMinPerKm,
    gradeAnalysis,
    confidence,
  };
}

/**
 * Complete function: Generate round trip and estimate time for athlete
 */
export async function generateRoundTripWithEstimation(
  request: RoundTripRequest,
  athleteProfile: AthletePerformanceProfile
): Promise<{
  route: RoundTripResponse;
  estimation: AthleteTimeEstimation;
}> {
  const route = await generateRoundTrip(request);
  const estimation = estimateAthleteTime(route, athleteProfile);

  return { route, estimation };
}
