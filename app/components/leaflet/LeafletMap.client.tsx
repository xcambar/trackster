import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css"; // Import Leaflet CSS

/**
 *
 * @TODO Styles are not imported yet, need to import Leaflet CSS
 * @TODO Maybe the map won't have a height, it must be styled with CSS
 * @returns
 */

export const LeafletMap: React.FC = () => {
  return (
    <MapContainer
      center={[51.505, -0.09]}
      zoom={13}
      scrollWheelZoom={false}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
    </MapContainer>
  );
};
