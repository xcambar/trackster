import React from "react";
import { MapContainer, TileLayer, useMap, Marker } from "react-leaflet";
import { StravaPolyline } from "./StravaPolyline.client";
import PolylineEncoded from "google-polyline";
import L from "leaflet";

import "leaflet/dist/leaflet.css";

const RouteMapFitter: React.FC<{ polyline: string }> = ({ polyline }) => {
  const map = useMap();
  
  React.useEffect(() => {
    if (polyline) {
      try {
        const decoded = PolylineEncoded.decode(polyline);
        if (decoded.length > 0) {
          // Calculate bounds from polyline points
          const bounds = decoded.reduce(
            (acc, [lat, lng]) => ({
              minLat: Math.min(acc.minLat, lat),
              maxLat: Math.max(acc.maxLat, lat),
              minLng: Math.min(acc.minLng, lng),
              maxLng: Math.max(acc.maxLng, lng),
            }),
            {
              minLat: decoded[0][0],
              maxLat: decoded[0][0],
              minLng: decoded[0][1],
              maxLng: decoded[0][1],
            }
          );
          
          // Fit map to route bounds with some padding
          map.fitBounds([
            [bounds.minLat, bounds.minLng],
            [bounds.maxLat, bounds.maxLng],
          ], { padding: [20, 20] });
        }
      } catch (error) {
        console.warn("Error fitting map to route:", error);
        // Fallback to default view (Freiburg area)
        map.setView([47.9959, 7.8522], 12);
      }
    }
  }, [polyline, map]);

  return null;
};

export interface RouteMapProps {
  polyline: string;
  height?: string | number;
  startLat?: number;
  startLng?: number;
}

// Create a custom marker icon using emoji
const createEmojiIcon = (emoji: string) => {
  return L.divIcon({
    html: `<div style="font-size: 24px; line-height: 1; text-align: left;">${emoji}</div>`,
    className: 'emoji-marker',
    iconSize: [30, 30],
    iconAnchor: [5, 15], // Shift anchor to the left so the flag pole aligns with the point
    popupAnchor: [15, -15]
  });
};

export const RouteMap: React.FC<RouteMapProps> = ({ 
  polyline, 
  height = 400,
  startLat,
  startLng
}) => {
  if (!polyline) {
    return null;
  }

  // Get starting point from polyline if not provided explicitly
  let startingPoint: [number, number] | null = null;
  if (startLat && startLng) {
    startingPoint = [startLat, startLng];
  } else {
    try {
      const decoded = PolylineEncoded.decode(polyline);
      if (decoded.length > 0) {
        startingPoint = decoded[0];
      }
    } catch (error) {
      console.warn("Error decoding polyline for starting point:", error);
    }
  }

  return (
    <MapContainer
      center={startingPoint || [47.9959, 7.8522]} // Use starting point or default to Freiburg
      zoom={12}
      scrollWheelZoom={true}
      style={{ 
        height: typeof height === 'number' ? `${height}px` : height,
        width: '100%',
        borderRadius: 8
      }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <StravaPolyline 
        encoded={polyline} 
        color="#1976d2" 
        weight={4}
        opacity={0.8}
      />
      {startingPoint && (
        <Marker 
          position={startingPoint}
          icon={createEmojiIcon("🏁")}
        />
      )}
      <RouteMapFitter polyline={polyline} />
    </MapContainer>
  );
};