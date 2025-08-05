import React from "react";
import { useGeolocated } from "react-geolocated";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { StravaPolyline } from "./StravaPolyline.client";
import { StravaSegmentPolyline } from "./StravaSegmentPolyline.client";

import "leaflet/dist/leaflet.css"; // Import Leaflet CSS
import { ActivityMap } from "~/lib/types/activity";

const MapGeolocationUpdater: React.FC<{
  center?: GeolocationCoordinates;
}> = ({ center }) => {
  const map = useMap();
  if (center) {
    map.setView([center.latitude, center.longitude], 13); // We're closing in on the current location, when available
  } else {
    map.setView([0, 0], 3); // The default map has a bird's eye view on the map
  }
  return null;
};

export const LeafletMap: React.FC<{ maps: ActivityMap[] }> = ({ maps }) => {
  const { coords /*, isGeolocationAvailable, isGeolocationEnabled*/ } =
    useGeolocated({
      positionOptions: {
        enableHighAccuracy: false,
      },
      userDecisionTimeout: 5000,
    });

  return (
    <MapContainer scrollWheelZoom={true} style={{ flexGrow: 1 }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {maps.map(({ activity, color }) => (
        <React.Fragment key={activity.id}>
          <StravaPolyline color={color} encoded={activity.map.polyline} />
          {(activity.segmentEfforts || []).map((segmentEffort) => (
            <StravaSegmentPolyline
              key={`${activity.id}-segment-${segmentEffort.id}`}
              segmentEffort={segmentEffort}
              activityPolyline={activity.map.polyline}
              color="#FF6B00" // Orange color for segments
            />
          ))}
        </React.Fragment>
      ))}
      <MapGeolocationUpdater center={coords} />
    </MapContainer>
  );
};
