import * as tj from "@tmcw/togeojson";
import { DOMParser } from "@xmldom/xmldom";
import { encode } from "google-polyline";
import { RoutePoint, RouteAnalysis, GradeDistribution, analyzeRoute } from "../analysis/route-analysis";

// Backward compatibility types - now aliases to unified types
export interface GPXPoint extends RoutePoint {}
export interface GPXGradeDistribution extends GradeDistribution {}
export interface GPXRoute extends RouteAnalysis {}
export interface GPXAnalysis extends RouteAnalysis {}

// Import unified analysis functions
import { calculateDistance, calculateGrade } from "../analysis/route-analysis";

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
  const points: RoutePoint[] = [];

  for (const feature of geoJSON.features) {
    if (feature.geometry.type === "LineString") {
      for (const coord of feature.geometry.coordinates) {
        if (
          coord &&
          coord.length >= 2 &&
          typeof coord[0] === "number" &&
          typeof coord[1] === "number"
        ) {
          points.push({
            lat: coord[1],
            lng: coord[0],
            elevation:
              coord.length > 2 && typeof coord[2] === "number"
                ? coord[2]
                : undefined,
          });
        }
      }
    }
  }

  if (points.length === 0) {
    throw new Error("No valid route data found in GPX file");
  }

  // Use unified analysis function instead of duplicate logic
  return analyzeRoute(points, name, description);
}

/**
 * Analyze GPX route for grade distribution and performance prediction
 * @deprecated Use parseGPXContent() directly - analysis is now included automatically
 */
export function analyzeGPXRoute(route: GPXRoute): GPXAnalysis {
  // The route from parseGPXContent already includes analysis
  // This function is kept for backward compatibility
  return route as GPXAnalysis;
}

/**
 * Validate GPX file content
 */
export function validateGPXContent(content: string): {
  valid: boolean;
  error?: string;
} {
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
