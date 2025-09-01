import { DOMParser } from "@xmldom/xmldom";
import * as tj from "@tmcw/togeojson";
import { encode } from "google-polyline";
import { categorizeGrade, GRADE_RANGES } from "~/lib/utils/grade-analysis";

export interface GPXPoint {
  lat: number;
  lng: number;
  elevation?: number;
  time?: Date;
}

export interface GPXRoute {
  name: string;
  description?: string;
  points: GPXPoint[];
  totalDistance: number; // meters
  totalElevationGain: number; // meters
  polyline: string; // Google polyline encoded
}

export interface GPXGradeDistribution {
  grade0To5Km: number;
  grade5To10Km: number;
  grade10To15Km: number;
  grade15To25Km: number;
  gradeOver25Km: number;
}

export interface GPXAnalysis extends GPXRoute {
  gradeDistribution: GPXGradeDistribution;
  averageGrade: number;
  maxGrade: number;
  minGrade: number;
}

/**
 * Calculate distance between two GPS points using Haversine formula
 */
function calculateDistance(point1: GPXPoint, point2: GPXPoint): number {
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
function calculateGrade(point1: GPXPoint, point2: GPXPoint, distance: number): number {
  if (!point1.elevation || !point2.elevation || distance === 0) {
    return 0;
  }
  const elevationDiff = point2.elevation - point1.elevation;
  return (elevationDiff / distance) * 100;
}

/**
 * Parse GPX XML content and extract route data
 */
export function parseGPXContent(gpxContent: string): GPXRoute {
  const parser = new DOMParser();
  const gpxDoc = parser.parseFromString(gpxContent, "text/xml");
  
  // Convert to GeoJSON first using togeojson
  const geoJSON = tj.gpx(gpxDoc);
  
  // Extract route name and description
  let name = "Uploaded Route";
  let description = "";
  
  // Try to get name from GPX metadata
  const nameElement = gpxDoc.getElementsByTagName("name")[0];
  if (nameElement?.textContent) {
    name = nameElement.textContent;
  }
  
  const descElement = gpxDoc.getElementsByTagName("desc")[0];
  if (descElement?.textContent) {
    description = descElement.textContent;
  }
  
  // Extract coordinates from GeoJSON
  const points: GPXPoint[] = [];
  
  for (const feature of geoJSON.features) {
    if (feature.geometry.type === "LineString") {
      for (const coord of feature.geometry.coordinates) {
        if (coord && coord.length >= 2 && typeof coord[0] === 'number' && typeof coord[1] === 'number') {
          points.push({
            lat: coord[1],
            lng: coord[0],
            elevation: coord.length > 2 && typeof coord[2] === 'number' ? coord[2] : undefined,
          });
        }
      }
    }
  }
  
  if (points.length === 0) {
    throw new Error("No valid route data found in GPX file");
  }
  
  // Calculate total distance and elevation gain
  let totalDistance = 0;
  let totalElevationGain = 0;
  
  for (let i = 1; i < points.length; i++) {
    const prevPoint = points[i - 1];
    const currPoint = points[i];
    
    if (prevPoint && currPoint) {
      const distance = calculateDistance(prevPoint, currPoint);
      totalDistance += distance;
      
      // Calculate elevation gain (only positive changes)
      if (currPoint.elevation && prevPoint.elevation) {
        const elevationDiff = currPoint.elevation - prevPoint.elevation;
        if (elevationDiff > 0) {
          totalElevationGain += elevationDiff;
        }
      }
    }
  }
  
  // Create Google polyline
  const polylinePoints: [number, number][] = points.map(p => [p.lat, p.lng]);
  const polyline = encode(polylinePoints);
  
  return {
    name,
    description,
    points,
    totalDistance,
    totalElevationGain,
    polyline,
  };
}

/**
 * Analyze GPX route for grade distribution and performance prediction
 */
export function analyzeGPXRoute(route: GPXRoute): GPXAnalysis {
  const gradeDistribution: GPXGradeDistribution = {
    grade0To5Km: 0,
    grade5To10Km: 0,
    grade10To15Km: 0,
    grade15To25Km: 0,
    gradeOver25Km: 0,
  };
  
  let totalGradeSum = 0;
  let gradeCount = 0;
  let maxGrade = -Infinity;
  let minGrade = Infinity;
  
  // Analyze each segment between consecutive points
  for (let i = 1; i < route.points.length; i++) {
    const point1 = route.points[i - 1];
    const point2 = route.points[i];
    
    if (point1 && point2) {
      const distance = calculateDistance(point1, point2);
      const grade = calculateGrade(point1, point2, distance);
      
      if (distance > 0) {
        // Update grade statistics
        totalGradeSum += Math.abs(grade);
        gradeCount++;
        maxGrade = Math.max(maxGrade, grade);
        minGrade = Math.min(minGrade, grade);
        
        // Categorize grade and add distance to appropriate bucket
        const absGrade = Math.abs(grade);
        const distanceKm = distance / 1000;
        
        if (absGrade < 5) {
          gradeDistribution.grade0To5Km += distanceKm;
        } else if (absGrade < 10) {
          gradeDistribution.grade5To10Km += distanceKm;
        } else if (absGrade < 15) {
          gradeDistribution.grade10To15Km += distanceKm;
        } else if (absGrade < 25) {
          gradeDistribution.grade15To25Km += distanceKm;
        } else {
          gradeDistribution.gradeOver25Km += distanceKm;
        }
      }
    }
  }
  
  const averageGrade = gradeCount > 0 ? totalGradeSum / gradeCount : 0;
  
  return {
    ...route,
    gradeDistribution,
    averageGrade,
    maxGrade: maxGrade === -Infinity ? 0 : maxGrade,
    minGrade: minGrade === Infinity ? 0 : minGrade,
  };
}

/**
 * Validate GPX file content
 */
export function validateGPXContent(content: string): { valid: boolean; error?: string } {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, "text/xml");
    
    // Check for parsing errors
    const parserError = doc.getElementsByTagName("parsererror")[0];
    if (parserError) {
      return { valid: false, error: "Invalid XML format" };
    }
    
    // Check if it's a GPX file
    const gpxElement = doc.getElementsByTagName("gpx")[0];
    if (!gpxElement) {
      return { valid: false, error: "Not a valid GPX file" };
    }
    
    // Check for track or route data
    const tracks = doc.getElementsByTagName("trk");
    const routes = doc.getElementsByTagName("rte");
    
    if (tracks.length === 0 && routes.length === 0) {
      return { valid: false, error: "No track or route data found" };
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, error: "Failed to parse GPX file" };
  }
}