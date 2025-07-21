import React from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { useGeolocated } from "react-geolocated";

import "leaflet/dist/leaflet.css"; // Import Leaflet CSS

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

export const LeafletMap: React.FC = () => {
  const { coords /*, isGeolocationAvailable, isGeolocationEnabled*/ } =
    useGeolocated({
      positionOptions: {
        enableHighAccuracy: false,
      },
      userDecisionTimeout: 5000,
    });
  return (
    <MapContainer scrollWheelZoom={false} style={{ flexGrow: 1 }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapGeolocationUpdater center={coords} />
    </MapContainer>
  );
};
