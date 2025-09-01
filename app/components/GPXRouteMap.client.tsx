import { decode } from "google-polyline";
import L from "leaflet";
import React from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap,
} from "react-leaflet";
import type { GPXAnalysis } from "~/lib/gpx/parser";

import "leaflet/dist/leaflet.css";

// Create a custom highlight marker icon
const highlightIcon = L.divIcon({
  className: "highlight-marker",
  html: `<div style="
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background-color: #FF0000;
    border: 2px solid white;
    box-shadow: 0 0 4px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

interface GPXRouteMapProps {
  gpxAnalysis: GPXAnalysis;
  height?: number;
  highlightDistance?: number | null;
}

const MapCenterUpdater: React.FC<{
  center: [number, number];
  zoom: number;
}> = ({ center, zoom }) => {
  const map = useMap();
  const [hasInitialized, setHasInitialized] = React.useState(false);

  React.useEffect(() => {
    // Only set the initial view, don't update when user has interacted with the map
    if (!hasInitialized) {
      map.setView(center, zoom);
      setHasInitialized(true);
    }
  }, [map, center, zoom, hasInitialized]);

  return null;
};

export const GPXRouteMap: React.FC<GPXRouteMapProps> = ({
  gpxAnalysis,
  height = 400,
  highlightDistance,
}) => {
  // Decode polyline to get coordinates
  const coordinates = decode(gpxAnalysis.polyline);

  // Calculate map bounds, center, and zoom (moved before early returns)
  const mapConfig = React.useMemo(() => {
    if (coordinates.length === 0) {
      return null;
    }

    const firstCoord = coordinates[0];
    if (!firstCoord || firstCoord.length < 2) {
      return null;
    }
    const bounds = coordinates.reduce(
      (acc, coord) => ({
        minLat: Math.min(acc.minLat, coord[0]),
        maxLat: Math.max(acc.maxLat, coord[0]),
        minLng: Math.min(acc.minLng, coord[1]),
        maxLng: Math.max(acc.maxLng, coord[1]),
      }),
      {
        minLat: firstCoord[0],
        maxLat: firstCoord[0],
        minLng: firstCoord[1],
        maxLng: firstCoord[1],
      }
    );

    const center: [number, number] = [
      (bounds.minLat + bounds.maxLat) / 2,
      (bounds.minLng + bounds.maxLng) / 2,
    ];

    // Calculate appropriate zoom level based on bounds
    const latDiff = bounds.maxLat - bounds.minLat;
    const lngDiff = bounds.maxLng - bounds.minLng;
    const maxDiff = Math.max(latDiff, lngDiff);

    let zoom = 10;
    if (maxDiff < 0.01) zoom = 15;
    else if (maxDiff < 0.05) zoom = 13;
    else if (maxDiff < 0.1) zoom = 12;
    else if (maxDiff < 0.5) zoom = 10;
    else zoom = 8;

    return { bounds, center, zoom };
  }, [coordinates]);

  // Calculate highlighted position based on distance
  const highlightedPosition: [number, number] | null = React.useMemo(() => {
    console.log(
      "GPXRouteMap: Calculating position for distance:",
      highlightDistance
    ); // Debug log
    if (
      highlightDistance === null ||
      highlightDistance === undefined ||
      !gpxAnalysis.points
    )
      return null;

    let cumulativeDistance = 0;
    const targetDistanceMeters = highlightDistance * 1000;

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

    for (let i = 1; i < gpxAnalysis.points.length; i++) {
      const prevPoint = gpxAnalysis.points[i - 1];
      const currentPoint = gpxAnalysis.points[i];

      if (prevPoint && currentPoint) {
        const segmentDistance = calculateDistance(
          prevPoint.lat,
          prevPoint.lng,
          currentPoint.lat,
          currentPoint.lng
        );

        if (cumulativeDistance + segmentDistance >= targetDistanceMeters) {
          // Interpolate between the two points
          const ratio =
            (targetDistanceMeters - cumulativeDistance) / segmentDistance;
          const lat =
            prevPoint.lat + (currentPoint.lat - prevPoint.lat) * ratio;
          const lng =
            prevPoint.lng + (currentPoint.lng - prevPoint.lng) * ratio;
          return [lat, lng];
        }

        cumulativeDistance += segmentDistance;
      }
    }

    // If we didn't find the exact distance, return the last point
    const lastPoint = gpxAnalysis.points[gpxAnalysis.points.length - 1];
    return lastPoint ? [lastPoint.lat, lastPoint.lng] : null;
  }, [highlightDistance, gpxAnalysis.points]);

  // Early return if no valid map configuration
  if (!mapConfig) {
    return (
      <div
        style={{
          height: `${height}px`,
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p>No route data to display</p>
      </div>
    );
  }

  return (
    <MapContainer
      center={mapConfig.center}
      zoom={mapConfig.zoom}
      style={{ height: `${height}px`, width: "100%" }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Polyline
        positions={coordinates}
        pathOptions={{
          color: "#FF5500", // Strava orange
          weight: 4,
          opacity: 0.8,
        }}
      />

      {/* Start point marker */}
      {coordinates.length > 0 && coordinates[0] && (
        <Polyline
          positions={[coordinates[0] as [number, number]]}
          pathOptions={{
            color: "#00FF00", // Green for start
            weight: 8,
            opacity: 1,
          }}
        />
      )}

      {/* End point marker */}
      {coordinates.length > 1 && coordinates[coordinates.length - 1] && (
        <Polyline
          positions={[coordinates[coordinates.length - 1] as [number, number]]}
          pathOptions={{
            color: "#FF0000", // Red for end
            weight: 8,
            opacity: 1,
          }}
        />
      )}

      {/* Highlight marker for chart hover */}
      {highlightedPosition && (
        <Marker position={highlightedPosition} icon={highlightIcon} />
      )}

      <MapCenterUpdater center={mapConfig.center} zoom={mapConfig.zoom} />
    </MapContainer>
  );
};
