import React from "react";
import { MapContainer, TileLayer, Polyline, useMap } from "react-leaflet";
import { decode } from "google-polyline";
import type { GPXAnalysis } from "~/lib/gpx/parser";

import "leaflet/dist/leaflet.css";

interface GPXRouteMapProps {
  gpxAnalysis: GPXAnalysis;
  height?: number;
}

const MapCenterUpdater: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  React.useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  return null;
};

export const GPXRouteMap: React.FC<GPXRouteMapProps> = ({ 
  gpxAnalysis,
  height = 400 
}) => {
  // Decode polyline to get coordinates
  const coordinates = decode(gpxAnalysis.polyline);
  
  // Calculate map center and zoom
  if (coordinates.length === 0) {
    return <div>No route data to display</div>;
  }

  const firstCoord = coordinates[0];
  if (!firstCoord || firstCoord.length < 2) {
    return <div>Invalid route data</div>;
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

  return (
    <MapContainer
      center={center}
      zoom={zoom}
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
      
      <MapCenterUpdater center={center} zoom={zoom} />
    </MapContainer>
  );
};