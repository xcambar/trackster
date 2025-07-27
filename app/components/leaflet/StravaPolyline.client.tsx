import {
  createElementObject,
  createPathComponent,
  extendContext,
  type PathProps,
} from "@react-leaflet/core";

import { Polyline as LeafletPolyline, type PolylineOptions } from "leaflet";

import PolylineEncoded from "google-polyline";

interface PolylineProps extends PolylineOptions, PathProps {
  encoded: string;
}

export const StravaPolyline = createPathComponent<
  LeafletPolyline,
  PolylineProps
>(
  function createPolyline({ encoded, ...options }, ctx) {
    const polyline = new LeafletPolyline(
      PolylineEncoded.decode(encoded),
      options
    );
    return createElementObject(
      polyline,
      extendContext(ctx, { overlayContainer: polyline })
    );
  },
  function updatePolyline(layer, props, prevProps) {
    if (props.encoded !== prevProps.encoded) {
      layer.setLatLngs(PolylineEncoded.decode(props.encoded));
    }
  }
);
