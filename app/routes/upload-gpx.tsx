import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  FormControl,
  FormLabel,
  Input,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import {
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import {
  Form,
  useActionData,
  useLoaderData,
  useNavigation,
} from "@remix-run/react";
import { ClientOnly } from "remix-utils/client-only";
import { AppBar } from "~/components/AppBar";
import { GPXVisualization } from "~/components/GPXVisualization.client";
import {
  analyzeGPXRoute,
  parseGPXContent,
  validateGPXContent,
  type GPXAnalysis,
} from "~/lib/gpx/parser";
import { getAthletePerformanceProfile } from "~/lib/models/activity";
import { getUserFromSession } from "~/lib/models/user";
import {
  racePredictionEngine,
  type RacePrediction,
} from "~/lib/race-predictor/prediction-engine";
import { getCompleteUserSession } from "~/services/session.server";

interface LoaderData {
  user: {
    id: string;
    firstName: string;
    lastName: string;
  };
  hasPerformanceProfile: boolean;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const userSession = await getCompleteUserSession(request);

  // Redirect unauthenticated users to login
  if (userSession === null) {
    throw redirect("/login");
  }

  const user = await getUserFromSession(userSession);
  const performanceProfile = await getAthletePerformanceProfile(user);

  return {
    user: {
      id: user.id,
      firstName: user.user_metadata.strava_profile.firstname,
      lastName: user.user_metadata.strava_profile.lastname,
    },
    hasPerformanceProfile: !!performanceProfile,
  };
}

interface ActionData {
  success?: boolean;
  gpxAnalysis?: GPXAnalysis;
  prediction?: RacePrediction;
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
    const gpxFile = formData.get("gpxFile") as File;

    if (!gpxFile || gpxFile.size === 0) {
      return {
        error: "Please select a GPX file to upload.",
      };
    }

    // Validate file type
    if (!gpxFile.name.toLowerCase().endsWith(".gpx")) {
      return {
        error: "Please upload a valid GPX file.",
      };
    }

    // Check file size (limit to 10MB)
    if (gpxFile.size > 10 * 1024 * 1024) {
      return {
        error: "File too large. Please upload a GPX file smaller than 10MB.",
      };
    }

    // Read file content
    const gpxContent = await gpxFile.text();

    // Validate GPX content
    const validation = validateGPXContent(gpxContent);
    if (!validation.valid) {
      return {
        error: validation.error || "Invalid GPX file format.",
      };
    }

    // Parse GPX content
    const gpxRoute = parseGPXContent(gpxContent);
    const gpxAnalysis = analyzeGPXRoute(gpxRoute);

    // Get user's performance profile for prediction
    const performanceProfile = await getAthletePerformanceProfile(user);
    if (!performanceProfile) {
      return {
        success: true,
        gpxAnalysis,
        error:
          "No performance profile found. Upload some activities first to get performance predictions.",
      };
    }

    // Create prediction input
    const predictionInput = {
      athleteId: Number(performanceProfile.athleteId),
      totalDistanceKm: gpxAnalysis.totalDistance / 1000,
      totalElevationGainM: gpxAnalysis.totalElevationGain,
      gradeDistribution: gpxAnalysis.gradeDistribution,
    };

    // Get performance prediction
    const prediction =
      await racePredictionEngine.predictRaceTime(predictionInput);

    return {
      success: true,
      gpxAnalysis,
      prediction,
    };
  } catch (error) {
    console.error("Error processing GPX file:", error);
    return {
      error:
        error instanceof Error ? error.message : "Failed to process GPX file",
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

function formatDistance(meters: number): string {
  const km = meters / 1000;
  return `${km.toFixed(2)} km`;
}

function formatElevation(meters: number): string {
  return `${Math.round(meters)} m`;
}

export default function UploadGPX() {
  const { /*user,*/ hasPerformanceProfile } = useLoaderData<LoaderData>();
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();

  const isSubmitting = navigation.state === "submitting";

  return (
    <>
      <AppBar showLogout />
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Upload GPX Route
        </Typography>

        <Typography variant="body1" color="text.secondary" paragraph>
          Upload a GPX file to analyze the route and get performance predictions
          based on your training history.
        </Typography>

        {!hasPerformanceProfile && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            No performance profile found. Upload some activities first to get
            personalized performance predictions.
          </Alert>
        )}

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Form method="post" encType="multipart/form-data">
              <FormControl fullWidth sx={{ mb: 3 }}>
                <FormLabel htmlFor="gpxFile" sx={{ mb: 1 }}>
                  GPX File
                </FormLabel>
                <Input
                  id="gpxFile"
                  name="gpxFile"
                  type="file"
                  inputProps={{ accept: ".gpx" }}
                  required
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  Select a GPX file from your device (max 10MB)
                </Typography>
              </FormControl>

              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={isSubmitting}
                startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
              >
                {isSubmitting ? "Analyzing Route..." : "Upload & Analyze"}
              </Button>
            </Form>
          </CardContent>
        </Card>

        {actionData?.error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {actionData.error}
          </Alert>
        )}

        {actionData?.success && actionData.gpxAnalysis && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Route Analysis: {actionData.gpxAnalysis.name}
              </Typography>

              {actionData.gpxAnalysis.description && (
                <Typography variant="body2" color="text.secondary" paragraph>
                  {actionData.gpxAnalysis.description}
                </Typography>
              )}

              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Distance
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {formatDistance(actionData.gpxAnalysis.totalDistance)}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Elevation Gain
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {formatElevation(actionData.gpxAnalysis.totalElevationGain)}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Average Grade
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {actionData.gpxAnalysis.averageGrade.toFixed(1)}%
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Max Grade
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {actionData.gpxAnalysis.maxGrade.toFixed(1)}%
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}

        {actionData?.success && actionData.prediction && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Performance Prediction
              </Typography>

              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Estimated Time
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="primary">
                    {formatTime(actionData.prediction.predictedTimeMinutes)}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Confidence Score
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {Math.round(actionData.prediction.confidenceScore * 100)}%
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Data Quality
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {actionData.prediction.athleteProfile.dataConfidence}
                  </Typography>
                </Box>
              </Box>

              {actionData.prediction.limitingFactors.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Limiting Factors
                  </Typography>
                  {actionData.prediction.limitingFactors.map(
                    (factor, index) => (
                      <Alert key={index} severity="info" sx={{ mt: 1 }}>
                        {factor}
                      </Alert>
                    )
                  )}
                </Box>
              )}

              {/* Grade Breakdown */}
              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                Performance Breakdown
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        <strong>Grade Range</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>Distance (km)</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>Pace (min/km)</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>Time</strong>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {actionData.prediction.gradeBreakdown.map(
                      (segment, index) => (
                        <TableRow key={index}>
                          <TableCell>{segment.gradeRange}</TableCell>
                          <TableCell align="right">
                            {segment.distanceKm.toFixed(1)}
                          </TableCell>
                          <TableCell align="right">
                            {segment.paceMinPerKm.toFixed(2)}
                          </TableCell>
                          <TableCell align="right">
                            {formatTime(segment.segmentTimeMinutes)}
                          </TableCell>
                        </TableRow>
                      )
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Prediction based on{" "}
                {actionData.prediction.athleteProfile.totalActivities}{" "}
                activities and{" "}
                {actionData.prediction.athleteProfile.totalDistanceKm.toFixed(
                  0
                )}{" "}
                km of training data.
              </Typography>
            </CardContent>
          </Card>
        )}

        {actionData?.success && actionData.gpxAnalysis && (
          <Box sx={{ mt: 3 }}>
            <ClientOnly>
              {() => (
                <GPXVisualization
                  gpxAnalysis={actionData.gpxAnalysis!}
                />
              )}
            </ClientOnly>
          </Box>
        )}
      </Container>
    </>
  );
}
