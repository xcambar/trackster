/**
 * Activity-to-Analysis Adapter
 * Converts database Activity + ActivityStreams to unified RouteAnalysis format
 */

import { Activity } from "@xcambar/trackster-db";
import { ActivityStreams } from "@xcambar/trackster-db/schemas/activity_streams";
import * as PolylineEncoded from "google-polyline";
import { RoutePoint, RouteAnalysis, analyzeRoute } from "./route-analysis";

export interface ActivityWithStreams {
  activity: Activity;
  streams?: ActivityStreams | null;
}

/**
 * Convert Activity + ActivityStreams to RoutePoint array
 */
export function activityToRoutePoints(data: ActivityWithStreams): RoutePoint[] {
  const { activity, streams } = data;
  
  // If we have detailed stream data, use it
  if (streams?.latlngData && streams.latlngData.length > 0) {
    return convertStreamsToPoints(streams);
  }
  
  // Fallback to polyline decoding if no stream data
  if (activity.map?.polyline) {
    return convertPolylineToPoints(activity.map.polyline);
  }
  
  // Last resort: use start/end coordinates if available
  if (activity.startLatlng || activity.endLatlng) {
    return convertCoordinatesToPoints(activity);
  }
  
  return [];
}

/**
 * Convert ActivityStreams data to RoutePoint array
 */
function convertStreamsToPoints(streams: ActivityStreams): RoutePoint[] {
  const points: RoutePoint[] = [];
  
  if (!streams.latlngData || streams.latlngData.length === 0) {
    return points;
  }
  
  const latlngs = streams.latlngData;
  const altitudes = streams.altitudeData || [];
  const times = streams.timeData || [];
  const distances = streams.distanceData || [];
  
  for (let i = 0; i < latlngs.length; i++) {
    const latlng = latlngs[i];
    if (!latlng || latlng.length < 2) continue;
    
    const point: RoutePoint = {
      lat: latlng[0],
      lng: latlng[1],
    };
    
    // Add elevation if available
    if (altitudes[i] !== undefined && altitudes[i] !== null) {
      point.elevation = altitudes[i]!;
    }
    
    // Add time if available (convert seconds since start to Date)
    if (times[i] !== undefined && times[i] !== null) {
      // Note: ActivityStreams time is typically seconds since start of activity
      // We would need the activity start time to convert to absolute time
      // For now, we'll create relative timestamps
      point.time = new Date(times[i]! * 1000);
    }
    
    // Add cumulative distance if available
    if (distances[i] !== undefined && distances[i] !== null) {
      point.distance = distances[i]!;
    }
    
    points.push(point);
  }
  
  return points;
}

/**
 * Convert polyline string to RoutePoint array (basic lat/lng only)
 */
function convertPolylineToPoints(polyline: string): RoutePoint[] {
  try {
    const coordinates = PolylineEncoded.decode(polyline);
    return coordinates.map(([lat, lng]) => ({ lat, lng }));
  } catch (error) {
    console.warn("Failed to decode polyline:", error);
    return [];
  }
}

/**
 * Convert activity coordinates to basic RoutePoint array (last resort)
 */
function convertCoordinatesToPoints(activity: Activity): RoutePoint[] {
  const points: RoutePoint[] = [];
  
  if (activity.startLatlng && activity.startLatlng.length >= 2) {
    points.push({
      lat: activity.startLatlng[0],
      lng: activity.startLatlng[1],
      elevation: activity.elevLow || undefined,
    });
  }
  
  if (activity.endLatlng && activity.endLatlng.length >= 2) {
    // Only add end point if it's different from start point
    const isDifferent = !activity.startLatlng || 
      Math.abs(activity.endLatlng[0] - activity.startLatlng[0]) > 0.0001 ||
      Math.abs(activity.endLatlng[1] - activity.startLatlng[1]) > 0.0001;
    
    if (isDifferent) {
      points.push({
        lat: activity.endLatlng[0],
        lng: activity.endLatlng[1],
        elevation: activity.elevHigh || undefined,
      });
    }
  }
  
  return points;
}

/**
 * Convert Activity + ActivityStreams to full RouteAnalysis
 */
export function activityToRouteAnalysis(data: ActivityWithStreams): RouteAnalysis {
  const { activity, streams } = data;
  
  const points = activityToRoutePoints(data);
  
  if (points.length === 0) {
    throw new Error(`No route data available for activity ${activity.id}`);
  }
  
  // Use existing polyline from activity
  const polyline = activity.map?.polyline || "";
  
  // Create base analysis from points
  const analysis = analyzeRoute(
    points,
    activity.name,
    activity.description || undefined,
    polyline
  );
  
  // Override with more accurate data from activity record where available
  const enhancedAnalysis: RouteAnalysis = {
    ...analysis,
    // Use activity's calculated values when available (more accurate than our calculations)
    totalDistance: activity.distance || analysis.totalDistance,
    totalElevationGain: activity.totalElevationGain || analysis.totalElevationGain,
    minElevation: activity.elevLow || analysis.minElevation,
    maxElevation: activity.elevHigh || analysis.maxElevation,
    elevationRange: (activity.elevHigh && activity.elevLow) 
      ? activity.elevHigh - activity.elevLow 
      : analysis.elevationRange,
    
    // Add performance metrics from activity
    totalTime: activity.elapsedTime || undefined,
    movingTime: activity.movingTime || undefined,
    averageSpeed: activity.averageSpeed || analysis.averageSpeed,
    maxSpeed: activity.maxSpeed || analysis.maxSpeed,
  };
  
  return enhancedAnalysis;
}

/**
 * Enhanced analysis with activity-specific metadata
 */
export interface ActivityAnalysis extends RouteAnalysis {
  // Activity-specific metadata
  activityId: number;
  sportType: string;
  startDate?: Date;
  startDateLocal?: Date;
  
  // Performance metrics from Strava
  achievementCount?: number;
  kudosCount?: number;
  prCount?: number;
  sufferScore?: number;
  
  // Power/Heart rate data if available
  averageWatts?: number;
  weightedAverageWatts?: number;
  maxWatts?: number;
  kilojoules?: number;
  hasHeartrate?: boolean;
  
  // Training metrics
  averageCadence?: number;
  trainer?: boolean;
  commute?: boolean;
  
  // Location
  locationCity?: string;
  locationState?: string;
  locationCountry?: string;
}

/**
 * Convert to enhanced ActivityAnalysis with all metadata
 */
export function activityToAnalysis(data: ActivityWithStreams): ActivityAnalysis {
  const { activity } = data;
  const routeAnalysis = activityToRouteAnalysis(data);
  
  return {
    ...routeAnalysis,
    
    // Activity metadata
    activityId: activity.id,
    sportType: activity.sportType,
    startDate: activity.startDate || undefined,
    startDateLocal: activity.startDateLocal || undefined,
    
    // Performance metrics
    achievementCount: activity.achievementCount || undefined,
    kudosCount: activity.kudosCount || undefined,
    prCount: activity.prCount || undefined,
    sufferScore: activity.sufferScore || undefined,
    
    // Power/HR metrics
    averageWatts: activity.averageWatts || undefined,
    weightedAverageWatts: activity.weightedAverageWatts || undefined,
    maxWatts: activity.maxWatts || undefined,
    kilojoules: activity.kilojoules || undefined,
    hasHeartrate: activity.hasHeartrate || undefined,
    
    // Training metrics
    averageCadence: activity.averageCadence || undefined,
    trainer: activity.trainer || undefined,
    commute: activity.commute || undefined,
    
    // Location
    locationCity: activity.locationCity || undefined,
    locationState: activity.locationState || undefined,
    locationCountry: activity.locationCountry || undefined,
  };
}

/**
 * Validate that activity has sufficient data for analysis
 */
export function canAnalyzeActivity(data: ActivityWithStreams): boolean {
  const points = activityToRoutePoints(data);
  return points.length >= 2; // Need at least 2 points for analysis
}