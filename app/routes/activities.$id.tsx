import {
  CompareArrows,
  EmojiEvents,
  Info,
  Speed,
  Terrain,
  Timer,
  TrendingDown,
  TrendingUp,
} from "@mui/icons-material";
import {
  Alert,
  AlertColor,
  Avatar,
  Badge,
  Box,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { data, redirect, useLoaderData } from "@remix-run/react";
import React, { lazy, Suspense } from "react";
import { ClientOnly } from "remix-utils/client-only";
import { AppBar } from "~/components/AppBar";
import { FlashMessage } from "~/components/FlashMessage";
import { ActivityAnalysis } from "~/lib/analysis/activity-adapter";
import { getActivityAnalysis } from "~/lib/models/activity-analysis";
import { getUserFromSession } from "~/lib/models/user";
import {
  racePredictionEngine,
  RacePredictionInput,
} from "~/lib/race-predictor/prediction-engine";
import { formatDistance, formatDuration } from "~/lib/utils/grade-analysis";
import {
  commitSession,
  getCompleteUserSession,
  getSession,
} from "~/services/session.server";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [
    {
      title: data
        ? `${data.analysis.name} - Activity Analysis`
        : "Activity Analysis",
    },
    {
      name: "description",
      content:
        "Detailed analysis of your activity including elevation, grade distribution, and performance metrics",
    },
  ];
};

export const loader = async ({ request, params }: ActionFunctionArgs) => {
  const browserSession = await getSession(request.headers.get("Cookie"));
  const userSession = await getCompleteUserSession(request);

  // Redirect unauthenticated users to login
  if (userSession === null) {
    throw redirect("/login");
  }

  const activityId = Number(params.id);
  if (isNaN(activityId)) {
    throw new Response("Invalid activity ID", { status: 400 });
  }

  const user = await getUserFromSession(userSession);
  const analysis = await getActivityAnalysis(activityId, user);

  if (!analysis) {
    throw new Response("Activity not found or cannot be analyzed", {
      status: 404,
    });
  }

  // Generate race prediction for performance comparison
  let racePrediction = null;
  try {
    const predictionInput: RacePredictionInput = {
      athleteId: Number(user.id),
      totalDistanceKm: analysis.totalDistance / 1000,
      totalElevationGainM: analysis.totalElevationGain,
      gradeDistribution: analysis.gradeDistribution,
    };
    racePrediction =
      await racePredictionEngine.predictRaceTime(predictionInput);
  } catch (error) {
    console.warn("Could not generate race prediction:", error);
  }

  return data(
    {
      analysis,
      racePrediction,
      flash: {
        error: browserSession.get("error"),
        warning: browserSession.get("warning"),
        info: browserSession.get("info"),
        success: browserSession.get("success"),
      },
    },
    // Clear flash messages
    { headers: { "Set-Cookie": await commitSession(browserSession) } }
  );
};

function formatPace(speed: number): string {
  const minPerKm = 1000 / (speed * 60); // Convert m/s to min/km
  const minutes = Math.floor(minPerKm);
  const seconds = Math.round((minPerKm - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}/km`;
}

function formatElevation(meters: number): string {
  return `${Math.round(meters)}m`;
}

function formatGrade(percent: number): string {
  return `${percent >= 0 ? "+" : ""}${percent.toFixed(1)}%`;
}

function getPerformanceStatus(
  actual: number,
  predicted: number,
  tolerance = 0.1
) {
  const difference = (actual - predicted) / predicted;
  if (Math.abs(difference) <= tolerance) return "on-track";
  return difference < 0 ? "exceeded" : "underperformed";
}

function getPerformanceColor(status: string) {
  switch (status) {
    case "exceeded":
      return "success";
    case "on-track":
      return "info";
    case "underperformed":
      return "warning";
    default:
      return "primary";
  }
}

function getPerformanceIcon(status: string) {
  switch (status) {
    case "exceeded":
      return <TrendingUp />;
    case "on-track":
      return <CompareArrows />;
    case "underperformed":
      return <TrendingDown />;
    default:
      return <Speed />;
  }
}

export default function ActivityDetail() {
  const loaderData = useLoaderData<typeof loader>();
  const { analysis, racePrediction } = loaderData;

  // Calculate performance metrics vs prediction
  const actualTimeMinutes = analysis.totalTime ? analysis.totalTime / 60 : null;
  const performanceStatus =
    actualTimeMinutes && racePrediction
      ? getPerformanceStatus(
          actualTimeMinutes,
          racePrediction.predictedTimeMinutes
        )
      : null;

  return (
    <Container maxWidth={false} disableGutters>
      {Object.entries(loaderData.flash).map(
        ([severity, message]) =>
          message && (
            <FlashMessage
              key={`${severity}-${message}`}
              severity={severity as AlertColor}
              message={message}
            />
          )
      )}

      <Box
        sx={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}
      >
        <AppBar showLogout={true} />

        <Container maxWidth="lg" sx={{ flexGrow: 1, py: 3 }}>
          {/* Performance Summary Hero */}
          <Paper
            elevation={3}
            sx={{
              mb: 3,
              overflow: "hidden",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            }}
          >
            <CardContent sx={{ p: 4, color: "white" }}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="flex-start"
                mb={2}
              >
                <Box sx={{ flex: 1 }}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    mb={1}
                  >
                    <Typography
                      variant="h3"
                      component="h1"
                      sx={{ fontWeight: "bold" }}
                    >
                      {analysis.name}
                    </Typography>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Chip
                        label={analysis.sportType}
                        sx={{
                          backgroundColor: "rgba(255,255,255,0.2)",
                          color: "white",
                        }}
                      />
                      {analysis.achievementCount ? (
                        <Badge
                          badgeContent={analysis.achievementCount}
                          color="warning"
                        >
                          <EmojiEvents sx={{ color: "gold" }} />
                        </Badge>
                      ) : null}
                    </Stack>
                  </Stack>
                </Box>

                {performanceStatus && (
                  <Paper sx={{ p: 2, textAlign: "center", minWidth: 120 }}>
                    <Avatar
                      sx={{
                        bgcolor: `${getPerformanceColor(performanceStatus)}.main`,
                        mb: 1,
                        mx: "auto",
                      }}
                    >
                      {getPerformanceIcon(performanceStatus)}
                    </Avatar>
                    <Typography
                      variant="caption"
                      display="block"
                      color="text.secondary"
                    >
                      Performance
                    </Typography>
                    <Typography
                      variant="h6"
                      color={`${getPerformanceColor(performanceStatus)}.main`}
                    >
                      {performanceStatus === "exceeded"
                        ? "Exceeded"
                        : performanceStatus === "on-track"
                          ? "On Track"
                          : "Below"}
                    </Typography>
                  </Paper>
                )}
              </Stack>

              {/* Key Performance Metrics */}
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 3,
                  mt: 2,
                  "& > *": {
                    flex: {
                      xs: "1 1 calc(50% - 12px)",
                      md: "1 1 calc(25% - 18px)",
                    },
                    minWidth: 0,
                  },
                }}
              >
                {/* 1. Distance */}
                <Stack alignItems="center" spacing={1}>
                  <Speed sx={{ fontSize: 32, opacity: 0.8 }} />
                  <Typography variant="h4" fontWeight="bold">
                    {formatDistance(analysis.totalDistance)}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    Distance
                  </Typography>
                </Stack>

                {/* 2. Pace */}
                {analysis.averageSpeed && (
                  <Stack alignItems="center" spacing={1}>
                    <TrendingUp sx={{ fontSize: 32, opacity: 0.8 }} />
                    <Typography variant="h4" fontWeight="bold">
                      {formatPace(analysis.averageSpeed)}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                      Avg Pace
                    </Typography>
                  </Stack>
                )}

                {/* 3. Time */}
                {analysis.totalTime && (
                  <Stack alignItems="center" spacing={1}>
                    <Timer sx={{ fontSize: 32, opacity: 0.8 }} />
                    <Typography variant="h4" fontWeight="bold">
                      {formatDuration(analysis.totalTime)}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                      Time
                    </Typography>
                  </Stack>
                )}

                {/* 4. Elevation Gain */}
                <Stack alignItems="center" spacing={1}>
                  <Terrain sx={{ fontSize: 32, opacity: 0.8 }} />
                  <Typography variant="h4" fontWeight="bold">
                    {formatElevation(analysis.totalElevationGain)}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    Elevation Gain
                  </Typography>
                </Stack>
              </Box>
            </CardContent>
          </Paper>

          {/* Performance Prediction vs Actual */}
          {racePrediction && actualTimeMinutes && (
            <Card
              sx={{
                mb: 3,
                borderRadius: 2,
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              }}
            >
              <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                {/* Card Header */}
                <Box
                  sx={{
                    p: 3,
                    pb: 2,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    background:
                      "linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.02) 100%)",
                  }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Box>
                      <Typography
                        variant="h5"
                        sx={{
                          fontWeight: 600,
                          color: "secondary.main",
                          mb: 0.5,
                        }}
                      >
                        Performance Analysis
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Predicted vs actual performance
                      </Typography>
                    </Box>
                    <Tooltip title="Based on your training history and race terrain">
                      <IconButton size="small" sx={{ color: "secondary.main" }}>
                        <Info />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Box>

                {/* Card Content */}
                <Box sx={{ p: 3 }}>
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: { xs: "column", md: "row" },
                      gap: 3,
                      alignItems: "flex-start",
                    }}
                  >
                    <Box sx={{ flex: { xs: "1", md: "0 0 33%" } }}>
                      <Stack spacing={2}>
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Predicted Time
                          </Typography>
                          <Typography variant="h5" color="primary">
                            {formatDuration(
                              racePrediction.predictedTimeMinutes * 60
                            )}
                          </Typography>
                        </Box>

                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Actual Time
                          </Typography>
                          <Typography
                            variant="h5"
                            color={`${getPerformanceColor(performanceStatus!)}.main`}
                          >
                            {formatDuration(analysis.totalTime!)}
                          </Typography>
                        </Box>

                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Difference
                          </Typography>
                          <Typography
                            variant="h6"
                            color={`${getPerformanceColor(performanceStatus!)}.main`}
                          >
                            {actualTimeMinutes >
                            racePrediction.predictedTimeMinutes
                              ? "+"
                              : ""}
                            {formatDuration(
                              Math.abs(
                                actualTimeMinutes -
                                  racePrediction.predictedTimeMinutes
                              ) * 60
                            )}
                          </Typography>
                        </Box>
                      </Stack>
                    </Box>

                    <Box sx={{ flex: { xs: "1", md: "0 0 67%" } }}>
                      <Box sx={{ mb: 2 }}>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          gutterBottom
                        >
                          Prediction Confidence:{" "}
                          {(racePrediction.confidenceScore * 100).toFixed(0)}%
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={racePrediction.confidenceScore * 100}
                          color={
                            racePrediction.confidenceScore >= 0.8
                              ? "success"
                              : racePrediction.confidenceScore >= 0.6
                                ? "info"
                                : "warning"
                          }
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                      </Box>

                      {racePrediction.limitingFactors.length > 0 && (
                        <Alert severity="info" variant="outlined">
                          <Typography variant="body2" gutterBottom>
                            <strong>Prediction Limitations:</strong>
                          </Typography>
                          <ul style={{ margin: 0, paddingLeft: 20 }}>
                            {racePrediction.limitingFactors.map(
                              (factor, index) => (
                                <li key={index}>
                                  <Typography variant="body2">
                                    {factor}
                                  </Typography>
                                </li>
                              )
                            )}
                          </ul>
                        </Alert>
                      )}
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Route Map */}
          <Card
            sx={{
              pb: 0,
              mb: 3,
              borderRadius: 2,
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              {/* Card Header */}
              <Box
                sx={{
                  p: 3,
                  pb: 2,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  background:
                    "linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.02) 100%)",
                }}
              >
                <Box>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 600,
                      color: "secondary.main",
                      mb: 0.5,
                    }}
                  >
                    Route Map
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Interactive map showing your route path
                  </Typography>
                </Box>
              </Box>

              {/* Card Content - No padding for full-bleed map */}
              <RouteMapWrapper analysis={analysis} />
            </CardContent>
          </Card>

          {/* Elevation Profile */}
          <Card
            sx={{
              mb: 3,
              borderRadius: 2,
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              {/* Card Header */}
              <Box
                sx={{
                  p: 3,
                  pb: 2,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  background:
                    "linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.02) 100%)",
                }}
              >
                <Box>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 600,
                      color: "secondary.main",
                      mb: 0.5,
                    }}
                  >
                    Elevation Profile
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Elevation changes and grade analysis along the route
                  </Typography>
                </Box>
              </Box>

              {/* Card Content */}
              <Box sx={{ p: 3 }}>
                <ElevationProfileWrapper analysis={analysis} />
              </Box>
            </CardContent>
          </Card>

          {/* Terrain Challenge Analysis */}
          <Card
            sx={{
              mb: 3,
              borderRadius: 2,
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              {/* Card Header */}
              <Box
                sx={{
                  p: 3,
                  pb: 2,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  background:
                    "linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.02) 100%)",
                }}
              >
                <Box>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 600,
                      color: "secondary.main",
                      mb: 0.5,
                    }}
                  >
                    Terrain Challenge Breakdown
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Grade distribution and difficulty analysis
                  </Typography>
                </Box>
              </Box>

              {/* Card Content */}
              <Box sx={{ p: 3 }}>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", md: "row" },
                    gap: 3,
                  }}
                >
                  {/* Difficulty Indicators */}
                  <Box sx={{ flex: { xs: "1", md: "0 0 33%" } }}>
                    <Stack spacing={2}>
                      <Paper
                        sx={{
                          p: 2,
                          textAlign: "center",
                          bgcolor: "primary.50",
                        }}
                      >
                        <Typography
                          variant="h4"
                          color="primary"
                          fontWeight="bold"
                        >
                          {formatGrade(analysis.averageGrade)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Average Grade
                        </Typography>
                      </Paper>

                      <Paper
                        sx={{
                          p: 2,
                          textAlign: "center",
                          bgcolor: "warning.50",
                        }}
                      >
                        <Typography
                          variant="h4"
                          color="warning.main"
                          fontWeight="bold"
                        >
                          {formatGrade(analysis.maxGrade)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Steepest Climb
                        </Typography>
                      </Paper>

                      <Paper
                        sx={{ p: 2, textAlign: "center", bgcolor: "info.50" }}
                      >
                        <Typography
                          variant="h4"
                          color="info.main"
                          fontWeight="bold"
                        >
                          {formatElevation(analysis.elevationRange)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Elevation Range
                        </Typography>
                      </Paper>
                    </Stack>
                  </Box>

                  {/* Grade Distribution */}
                  <Box sx={{ flex: { xs: "1", md: "0 0 67%" } }}>
                    <Typography variant="h6" gutterBottom>
                      Grade Distribution Analysis
                    </Typography>

                    <GradeDistributionChartWrapper
                      gradeDistribution={analysis.gradeDistribution}
                      totalDistance={analysis.totalDistance}
                    />
                  </Box>
                </Box>

                {/* Terrain Analysis Hints - Full Width */}
                <Box sx={{ mt: 3 }}>
                  <Stack spacing={2}>
                    {/* Significant climbs */}
                    {analysis.gradeDistribution.grade10To15Km +
                      analysis.gradeDistribution.grade15To25Km +
                      analysis.gradeDistribution.gradeOver25Km >
                      0 && (
                      <Alert severity="warning" variant="outlined">
                        <Typography variant="body2">
                          <strong>Challenging Climbs:</strong> This route
                          includes{" "}
                          {formatDistance(
                            (analysis.gradeDistribution.grade10To15Km +
                              analysis.gradeDistribution.grade15To25Km +
                              analysis.gradeDistribution.gradeOver25Km) *
                              1000
                          )}{" "}
                          of steep terrain (&gt;10% grade)
                        </Typography>
                      </Alert>
                    )}

                    {/* Rolling terrain */}
                    {analysis.gradeDistribution.grade0To5Km +
                      analysis.gradeDistribution.grade5To10Km >
                      (analysis.totalDistance / 1000) * 0.6 && (
                      <Alert severity="info" variant="outlined">
                        <Typography variant="body2">
                          <strong>Rolling Terrain:</strong> Most of this route
                          features moderate climbs and descents
                        </Typography>
                      </Alert>
                    )}

                    {/* Downhill sections */}
                    {analysis.gradeDistribution.gradeNeg10ToNeg5Km +
                      analysis.gradeDistribution.gradeNeg15ToNeg10Km +
                      analysis.gradeDistribution.gradeNeg25ToNeg15Km +
                      analysis.gradeDistribution.gradeNegOver25Km >
                      0.5 && (
                      <Alert severity="success" variant="outlined">
                        <Typography variant="body2">
                          <strong>Fast Descents:</strong> Significant downhill
                          sections provided speed opportunities
                        </Typography>
                      </Alert>
                    )}
                  </Stack>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Activity Metadata */}
          {(analysis.locationCity ||
            analysis.startDate ||
            analysis.kudosCount ||
            analysis.achievementCount) && (
            <Card
              sx={{
                mb: 3,
                borderRadius: 2,
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              }}
            >
              <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                {/* Card Header */}
                <Box
                  sx={{
                    p: 3,
                    pb: 2,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    background:
                      "linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.02) 100%)",
                  }}
                >
                  <Box>
                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 600,
                        color: "secondary.main",
                        mb: 0.5,
                      }}
                    >
                      Activity Details
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Location, date, and social metrics
                    </Typography>
                  </Box>
                </Box>

                {/* Card Content */}
                <Box sx={{ p: 3 }}>
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 3,
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: { xs: "column", sm: "row" },
                        gap: 3,
                      }}
                    >
                      {analysis.startDate && (
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            Date
                          </Typography>
                          <Typography variant="body1">
                            {new Date(analysis.startDate).toLocaleDateString(
                              "en-US",
                              {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              }
                            )}
                          </Typography>
                        </Box>
                      )}

                      {(analysis.locationCity || analysis.locationState) && (
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            Location
                          </Typography>
                          <Typography variant="body1">
                            {[
                              analysis.locationCity,
                              analysis.locationState,
                              analysis.locationCountry,
                            ]
                              .filter(Boolean)
                              .join(", ")}
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    <Box>
                      <Divider sx={{ my: 2 }} />
                      <Stack direction="row" spacing={4}>
                        {analysis.kudosCount !== undefined && (
                          <Stack alignItems="center">
                            <Typography variant="h5" color="primary">
                              {analysis.kudosCount}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Kudos
                            </Typography>
                          </Stack>
                        )}

                        {analysis.achievementCount !== undefined && (
                          <Stack alignItems="center">
                            <Typography variant="h5" color="warning.main">
                              {analysis.achievementCount}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Achievements
                            </Typography>
                          </Stack>
                        )}

                        {analysis.sufferScore !== undefined && (
                          <Stack alignItems="center">
                            <Typography variant="h5" color="error">
                              {analysis.sufferScore}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Suffer Score
                            </Typography>
                          </Stack>
                        )}
                      </Stack>
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          )}
        </Container>
      </Box>
    </Container>
  );
}

// Client-only wrapper for GradeDistributionChart
const GradeDistributionChartWrapper: React.FC<{
  gradeDistribution: ActivityAnalysis["gradeDistribution"];
  totalDistance: number;
}> = ({ gradeDistribution, totalDistance }) => {
  return (
    <ClientOnly fallback={<div>Loading chart...</div>}>
      {() => {
        // Use dynamic import to avoid SSR issues
        const GradeDistributionChart = lazy(() =>
          import("~/components/GradeDistributionChart.client").then(
            (module) => ({
              default: module.GradeDistributionChart,
            })
          )
        );

        return (
          <Suspense fallback={<div>Loading chart...</div>}>
            <GradeDistributionChart
              gradeDistribution={gradeDistribution}
              totalDistance={totalDistance}
            />
          </Suspense>
        );
      }}
    </ClientOnly>
  );
};

// Client-only wrapper for Route Map
const RouteMapWrapper: React.FC<{ analysis: ActivityAnalysis }> = ({
  analysis,
}) => {
  return (
    <ClientOnly fallback={<div>Loading map...</div>}>
      {() => {
        // Use dynamic import to avoid SSR issues
        const RouteMap = lazy(() =>
          import("~/components/RouteMap.client").then((module) => ({
            default: module.RouteMap,
          }))
        );

        return (
          <Suspense fallback={<div>Loading map...</div>}>
            <RouteMap analysis={analysis} height={400} />
          </Suspense>
        );
      }}
    </ClientOnly>
  );
};

// Client-only wrapper for Elevation Profile
const ElevationProfileWrapper: React.FC<{ analysis: ActivityAnalysis }> = ({
  analysis,
}) => {
  return (
    <ClientOnly fallback={<div>Loading elevation profile...</div>}>
      {() => {
        // Use dynamic import to avoid SSR issues
        const ElevationGraph = lazy(() =>
          import("~/components/ElevationGraph.client").then((module) => ({
            default: module.ElevationGraph,
          }))
        );

        return (
          <Suspense fallback={<div>Loading elevation profile...</div>}>
            <ElevationGraph analysis={analysis} height={300} />
          </Suspense>
        );
      }}
    </ClientOnly>
  );
};
