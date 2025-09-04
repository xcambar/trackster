import { Box, CircularProgress } from "@mui/material";
import { ClientOnly } from "remix-utils/client-only";
import { Suspense } from "react";
import { RouteMap } from "~/components/leaflet/RouteMap.client";

interface RouteMapWrapperProps {
  polyline: string;
  height?: string | number;
  startLat?: number;
  startLng?: number;
}

export function RouteMapWrapper({ polyline, height = 400, startLat, startLng }: RouteMapWrapperProps) {
  if (!polyline) {
    return null;
  }

  return (
    <ClientOnly fallback={
      <Box 
        sx={{ 
          height: typeof height === 'number' ? `${height}px` : height,
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          bgcolor: 'grey.100',
          borderRadius: 1
        }}
      >
        <CircularProgress />
      </Box>
    }>
      {() => (
        <Suspense fallback={
          <Box 
            sx={{ 
              height: typeof height === 'number' ? `${height}px` : height,
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              bgcolor: 'grey.100',
              borderRadius: 1
            }}
          >
            <CircularProgress />
          </Box>
        }>
          <RouteMap 
            polyline={polyline} 
            height={height}
            startLat={startLat}
            startLng={startLng}
          />
        </Suspense>
      )}
    </ClientOnly>
  );
}