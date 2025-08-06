import {
  Box,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { ActionFunctionArgs } from "@remix-run/node";
import { redirect, useLoaderData } from "@remix-run/react";
import {
  getActivityStreamsForUser,
  getAthletePerformanceProfile,
  getPersonalBests,
  PersonalBest,
} from "~/lib/models/activity";
import { getUserFromSession } from "~/lib/models/user";
import { racePredictionEngine } from "~/lib/race-predictor/prediction-engine";
import {
  analyzeGradePerformance,
  formatDistance,
  formatDuration,
  formatPace,
} from "~/lib/utils/grade-analysis";
import { getCompleteUserSession } from "~/services/session.server";

export async function loader({ request }: ActionFunctionArgs) {
  const userSession = await getCompleteUserSession(request);

  // Redirect unauthenticated users to login
  if (userSession === null) {
    throw redirect("/login");
  }

  const user = await getUserFromSession(userSession);
  const activityStreams = await getActivityStreamsForUser(user);
  const performanceProfile = await getAthletePerformanceProfile(user);
  const personalBests = await getPersonalBests(user);
  const gradeAnalysis = analyzeGradePerformance(activityStreams);

  // Example race predictions for common distances
  let racePredictions = null;
  if (performanceProfile) {
    try {
      // Predict flat races for 5K, 10K, half marathon, and marathon
      const flat5K = await racePredictionEngine.predictRaceTime({
        athleteId: user.user_metadata.strava_profile.id,
        totalDistanceKm: 5,
        totalElevationGainM: 0,
        gradeDistribution: {
          grade0To5Km: 5,
          grade5To10Km: 0,
          grade10To15Km: 0,
          grade15To25Km: 0,
          gradeOver25Km: 0,
        },
      });

      const flat10K = await racePredictionEngine.predictRaceTime({
        athleteId: user.user_metadata.strava_profile.id,
        totalDistanceKm: 10,
        totalElevationGainM: 0,
        gradeDistribution: {
          grade0To5Km: 10,
          grade5To10Km: 0,
          grade10To15Km: 0,
          grade15To25Km: 0,
          gradeOver25Km: 0,
        },
      });

      const flatHalfMarathon = await racePredictionEngine.predictRaceTime({
        athleteId: user.user_metadata.strava_profile.id,
        totalDistanceKm: 21.1,
        totalElevationGainM: 50, // Very flat
        gradeDistribution: {
          grade0To5Km: 21.1,
          grade5To10Km: 0,
          grade10To15Km: 0,
          grade15To25Km: 0,
          gradeOver25Km: 0,
        },
      });

      const flatMarathon = await racePredictionEngine.predictRaceTime({
        athleteId: user.user_metadata.strava_profile.id,
        totalDistanceKm: 42.2,
        totalElevationGainM: 100, // Very flat
        gradeDistribution: {
          grade0To5Km: 42.2,
          grade5To10Km: 0,
          grade10To15Km: 0,
          grade15To25Km: 0,
          gradeOver25Km: 0,
        },
      });

      racePredictions = {
        flat5K,
        flat10K,
        flatHalfMarathon,
        flatMarathon,
      };
    } catch (error) {
      console.error("Race prediction error:", error);
    }
  }

  return {
    personalBests,
    racePredictions,
    gradeAnalysis,
  };
}

function formatRaceTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  const secs = Math.round((minutes % 1) * 60);

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function RacePredictionsCard({
  racePredictions,
  personalBests,
}: {
  racePredictions: RacePredictions | null;
  personalBests: { [distance: string]: PersonalBest | null };
}) {
  if (!racePredictions) {
    return (
      <Paper elevation={2} sx={{ p: 3, textAlign: "center" }}>
        <Typography variant="h6" gutterBottom>
          Race Predictions
        </Typography>
        <Typography variant="body1" color="text.secondary">
          No performance profile available for predictions
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Complete more activities to build your performance profile
        </Typography>
      </Paper>
    );
  }

  const distances = [
    { key: "flat5K", label: "5K Flat", pb: personalBests["5k"] },
    { key: "flat10K", label: "10K Flat", pb: personalBests["10k"] },
    {
      key: "flatHalfMarathon",
      label: "Half Marathon Flat",
      pb: personalBests["halfMarathon"],
    },
    {
      key: "flatMarathon",
      label: "Marathon Flat",
      pb: personalBests["marathon"],
    },
  ];

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Race Time Predictions
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="subtitle2" gutterBottom sx={{ mb: 2 }}>
            Predicted Times
          </Typography>
          {distances.map(({ key, label }) => {
            const prediction = racePredictions[key as keyof RacePredictions];
            return (
              <Box key={key} sx={{ mb: 2 }}>
                <Typography variant="subtitle1" color="primary" gutterBottom>
                  <strong>{label}:</strong>{" "}
                  {formatRaceTime(prediction.predictedTimeMinutes)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Confidence: {Math.round(prediction.confidenceScore * 100)}%
                </Typography>
              </Box>
            );
          })}
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Typography variant="subtitle2" gutterBottom sx={{ mb: 2 }}>
            Personal Bests
          </Typography>
          {distances.map(({ key, label, pb }) => (
            <Box key={`pb-${key}`} sx={{ mb: 2 }}>
              <Typography variant="body1" gutterBottom>
                <strong>{label.replace(" Flat", "")}:</strong>{" "}
                {pb ? formatRaceTime(pb.timeMinutes) : "N/A"}
              </Typography>
              {pb && (
                <Typography variant="body2" color="text.secondary">
                  {new Date(pb.activity.startDateLocal!).toLocaleDateString()}
                </Typography>
              )}
            </Box>
          ))}
        </Grid>
      </Grid>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mt: 2, fontStyle: "italic" }}
      >
        Based on {racePredictions.flat10K.athleteProfile.totalActivities}{" "}
        activities,
        {Math.round(racePredictions.flat10K.athleteProfile.totalDistanceKm)}km
        total
      </Typography>
    </Paper>
  );
}

export default function StatisticsIndex() {
  const loaderData = useLoaderData<typeof loader>();
  const { gradeAnalysis, racePredictions, personalBests } = loaderData;

  return (
    <>
      {/* Race Predictions Card */}
      <Box sx={{ mb: 4 }}>
        <RacePredictionsCard
          racePredictions={racePredictions}
          personalBests={personalBests}
        />
      </Box>

      {/* Grade Analysis Table */}
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Performance by Grade
        </Typography>

        {gradeAnalysis.length > 0 ? (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <strong>Grade Range</strong>
                </TableCell>
                <TableCell align="right">
                  <strong>Total Time</strong>
                </TableCell>
                <TableCell align="right">
                  <strong>Average Pace</strong>
                </TableCell>
                <TableCell align="right">
                  <strong>Total Distance</strong>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {gradeAnalysis.map((analysis) => (
                <TableRow key={analysis.gradeRange}>
                  <TableCell component="th" scope="row">
                    {analysis.gradeRange}
                  </TableCell>
                  <TableCell align="right">
                    {formatDuration(analysis.totalTimeSeconds)}
                  </TableCell>
                  <TableCell align="right">
                    {formatPace(analysis.averagePaceMinPerKm)} /km
                  </TableCell>
                  <TableCell align="right">
                    {formatDistance(analysis.totalDistanceMeters)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ textAlign: "center", py: 4 }}
          >
            No grade analysis data available. Activity stream data is required
            for grade analysis.
          </Typography>
        )}
      </Paper>
    </>
  );
}
interface RacePredictions {
  flat5K: {
    predictedTimeMinutes: number;
    confidenceScore: number;
    athleteProfile: {
      totalActivities: number;
      totalDistanceKm: number;
    };
  };
  flat10K: {
    predictedTimeMinutes: number;
    confidenceScore: number;
    athleteProfile: {
      totalActivities: number;
      totalDistanceKm: number;
    };
  };
  flatHalfMarathon: {
    predictedTimeMinutes: number;
    confidenceScore: number;
  };
  flatMarathon: {
    predictedTimeMinutes: number;
    confidenceScore: number;
  };
}
