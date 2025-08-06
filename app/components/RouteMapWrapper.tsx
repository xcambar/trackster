import { Box, CircularProgress } from "@mui/material";
import { ClientOnly } from "remix-utils/client-only";
import { lazy, Suspense } from "react";

// Lazy load the client-only RouteMap component
const RouteMapClient = lazy(() => 
  import("~/components/leaflet/RouteMap.client").then(module => ({ 
    default: module.RouteMap 
  }))
);

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
          <RouteMapClient 
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