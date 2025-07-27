import {
  createElementObject,
  createPathComponent,
  extendContext,
  type PathProps,
} from "@react-leaflet/core";

import { Polyline as LeafletPolyline, type PolylineOptions } from "leaflet";

import PolylineEncoded from "google-polyline";
import { DetailedActivity } from "strava";
import { ActivityMap } from "~/routes/_index";

interface PolylineProps extends PolylineOptions, PathProps {
  encoded: string;
}

const colors: string[] = [
  "#FF0000",
  "#0066FF",
  "#00CC00",
  "#FF6600",
  "#9900CC",
  "#FFCC00",
  "#FF0099",
  "#00CCFF",
  "#CC3300",
  "#006600",
];

export const buildStravaPolylineConfig = (
  activity: DetailedActivity,
  id: number
): ActivityMap => {
  return {
    color: colors[id % colors.length] as string,
    polyline: activity.map.polyline,
    activityId: activity.id,
  };
};

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
