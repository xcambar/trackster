import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  FormControlLabel,
  Slider,
  Switch,
  Typography,
} from "@mui/material";
import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import { useState } from "react";
import { AppBar } from "~/components/AppBar";
import { RouteMapWrapper } from "~/components/RouteMapWrapper";
import { getAthletePerformanceProfile } from "~/lib/models/activity";
import { getUserFromSession } from "~/lib/models/user";
import {
  getDefaultLocation,
  getMostCommonStartingLocation,
} from "~/lib/models/user-location";
import {
  generateRoundTripWithEstimation,
  type RoundTripRequest,
} from "~/lib/routing/round-trip-generator";
import { getCompleteUserSession } from "~/services/session.server";

interface LoaderData {
  user: {
    id: string;
    firstName: string;
    lastName: string;
  };
  hasPerformanceProfile: boolean;
  startingLocation: {
    lat: number;
    lng: number;
    count: number;
  };
}

export async function loader({ request }: LoaderFunctionArgs) {
  const userSession = await getCompleteUserSession(request);

  // Redirect unauthenticated users to login
  if (userSession === null) {
    throw redirect("/login");
  }

  const user = await getUserFromSession(userSession);
  const performanceProfile = await getAthletePerformanceProfile(user);

  // Get user's most common starting location
  const mostCommonLocation = await getMostCommonStartingLocation(user);
  const startingLocation = mostCommonLocation || getDefaultLocation();

  return {
    user: {
      id: user.id,
      firstName: user.user_metadata.strava_profile.firstname,
      lastName: user.user_metadata.strava_profile.lastname,
    },
    hasPerformanceProfile: !!performanceProfile,
    startingLocation,
  };
}

interface ActionData {
  success?: boolean;
  route?: {
    distance: number;
    elevationGain: number;
    polyline: string;
    estimatedTimeMinutes: number;
    averagePaceMinPerKm: number;
    confidence: number;
  };
  error?: string;
}

export async function action({ request }: ActionFunctionArgs) {
  const userSession = await getCompleteUserSession(request);

  if (userSession === null) {
    throw redirect("/login");
  }

  const user = await getUserFromSession(userSession);

  try {
    const formData = await request.formData();
    const distanceKm = Number(formData.get("distance"));
    const preferTrails = formData.get("preferTrails") === "on";

    if (!distanceKm || distanceKm < 3 || distanceKm > 50) {
      return {
        error: "Invalid distance. Must be between 3 and 50 km.",
      };
    }

    // Get user's performance profile
    const performanceProfile = await getAthletePerformanceProfile(user);
    if (!performanceProfile) {
      return {
        error:
          "No performance profile found. Please sync some activities first.",
      };
    }

    // Get user's preferred starting location
    const mostCommonLocation = await getMostCommonStartingLocation(user);
    const startingLocation = mostCommonLocation || getDefaultLocation();

    const roundTripRequest: RoundTripRequest = {
      startLat: startingLocation.lat,
      startLng: startingLocation.lng,
      distanceMeters: distanceKm * 1000,
      seed: Math.floor(Math.random() * 1000), // Random route each time
      preferTrails: preferTrails,
    };

    const result = await generateRoundTripWithEstimation(
      roundTripRequest,
      performanceProfile
    );

    return {
      success: true,
      route: {
        distance: result.route.distance,
        elevationGain: result.route.elevationGain,
        polyline: result.route.polyline,
        estimatedTimeMinutes: result.estimation.estimatedTimeMinutes,
        averagePaceMinPerKm: result.estimation.averagePaceMinPerKm,
        confidence: result.estimation.confidence,
      },
    };
  } catch (error) {
    console.error("Error generating route:", error);
    return {
      error:
        error instanceof Error ? error.message : "Failed to generate route",
    };
  }
}

function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);

  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

export default function NewRoute() {
  const { /*user,*/ hasPerformanceProfile, startingLocation } =
    useLoaderData<LoaderData>();
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const [distance, setDistance] = useState(10);
  const [preferTrails, setPreferTrails] = useState(false);

  const isSubmitting = navigation.state === "submitting";

  return (
    <>
      <AppBar showLogout />
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Generate New Route
        </Typography>

        <Typography variant="body1" color="text.secondary" paragraph>
          Create a personalized round-trip route with performance predictions
          based on your activity history.
        </Typography>

        {startingLocation.count > 0 && (
          <Alert severity="info" sx={{ mb: 3 }}>
            Starting location based on your most common activity starts.
          </Alert>
        )}

        {startingLocation.count === 0 && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            Using default starting location (Freiburg). Complete more activities
            to get personalized starting points.
          </Alert>
        )}

        {!hasPerformanceProfile && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            No performance profile found. Please sync some activities first to
            get personalized predictions.
          </Alert>
        )}

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Form method="post">
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom>
                  Route Distance: {distance} km
                </Typography>
                <Slider
                  value={distance}
                  onChange={(_, value) => setDistance(value as number)}
                  min={3}
                  max={50}
                  step={1}
                  marks={[
                    { value: 5, label: "5km" },
                    { value: 10, label: "10km" },
                    { value: 21, label: "Half Marathon" },
                    { value: 30, label: "30km" },
                    { value: 42, label: "Marathon" },
                    { value: 50, label: "50km" },
                  ]}
                  valueLabelDisplay="auto"
                  sx={{ mt: 2 }}
                />
                <input type="hidden" name="distance" value={distance} />
              </Box>

              <Box sx={{ mb: 3 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferTrails}
                      onChange={(e) => setPreferTrails(e.target.checked)}
                      name="preferTrails"
                      disabled={true}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1" color="text.disabled">
                        Prefer Trails
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Use hiking paths and trails instead of roads when
                        available
                      </Typography>
                    </Box>
                  }
                />
                <Alert severity="info" sx={{ mt: 1 }}>
                  Our current subscription to the routing service does not allow
                  to choose the terrain. Thank you for your understanding.
                </Alert>
              </Box>

              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={isSubmitting || !hasPerformanceProfile}
                startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
              >
                {isSubmitting ? "Generating Route..." : "Generate Route"}
              </Button>
            </Form>
          </CardContent>
        </Card>

        {actionData?.error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {actionData.error}
          </Alert>
        )}

        {actionData?.success && actionData.route && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Route Generated Successfully!
              </Typography>

              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 2 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Distance
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {(actionData.route.distance / 1000).toFixed(2)} km
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Elevation Gain
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {Math.round(actionData.route.elevationGain)} m
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Estimated Time
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {formatTime(actionData.route.estimatedTimeMinutes)}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Average Pace
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {actionData.route.averagePaceMinPerKm.toFixed(2)} min/km
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Prediction Confidence
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {Math.round(actionData.route.confidence * 100)}%
                  </Typography>
                </Box>
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Route coordinates: {actionData.route.polyline.length} encoded
                points
              </Typography>

              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Route Map
                </Typography>
                <RouteMapWrapper
                  polyline={actionData.route?.polyline || ""}
                  height={400}
                  startLat={startingLocation.lat}
                  startLng={startingLocation.lng}
                />
              </Box>
            </CardContent>
          </Card>
        )}
      </Container>
    </>
  );
}
