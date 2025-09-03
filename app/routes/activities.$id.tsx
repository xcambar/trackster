import { AlertColor, Box, Container, Card, CardContent, Typography, Chip, Grid } from "@mui/material";
import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { data, redirect, useLoaderData } from "@remix-run/react";
import { useState } from "react";
import { ClientOnly } from "remix-utils/client-only";
import { AppBar } from "~/components/AppBar";
import { FlashMessage } from "~/components/FlashMessage";
import { getActivityAnalysis } from "~/lib/models/activity-analysis";
import { getUserFromSession } from "~/lib/models/user";
import { ActivityAnalysis } from "~/lib/analysis/activity-adapter";
import { formatDistance, formatDuration, formatPace } from "~/lib/utils/grade-analysis";
import {
  commitSession,
  getCompleteUserSession,
  getSession,
} from "~/services/session.server";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [
    { title: data ? `${data.analysis.name} - Activity Analysis` : "Activity Analysis" },
    { name: "description", content: "Detailed analysis of your activity including elevation, grade distribution, and performance metrics" },
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
    throw new Response("Activity not found or cannot be analyzed", { status: 404 });
  }

  return data(
    {
      analysis,
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

function formatSpeed(speed: number): string {
  const kmh = speed * 3.6; // Convert m/s to km/h
  return `${kmh.toFixed(1)} km/h`;
}

function formatElevation(meters: number): string {
  return `${Math.round(meters)}m`;
}

function formatGrade(percent: number): string {
  return `${percent >= 0 ? '+' : ''}${percent.toFixed(1)}%`;
}

export default function ActivityDetail() {
  const loaderData = useLoaderData<typeof loader>();
  const { analysis } = loaderData;

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
      
      <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
        <AppBar showLogout={true} />
        
        <Container maxWidth="lg" sx={{ flexGrow: 1, py: 3 }}>
          {/* Activity Header */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Typography variant="h4" component="h1">
                  {analysis.name}
                </Typography>
                <Chip label={analysis.sportType} color="primary" />
              </Box>
              
              {analysis.description && (
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                  {analysis.description}
                </Typography>
              )}

              {/* Key Metrics */}
              <Grid container spacing={3}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="text.secondary">
                    Distance
                  </Typography>
                  <Typography variant="h6">
                    {formatDistance(analysis.totalDistance)}
                  </Typography>
                </Grid>
                
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="text.secondary">
                    Elevation Gain
                  </Typography>
                  <Typography variant="h6">
                    {formatElevation(analysis.totalElevationGain)}
                  </Typography>
                </Grid>
                
                {analysis.totalTime && (
                  <Grid item xs={6} sm={3}>
                    <Typography variant="body2" color="text.secondary">
                      Time
                    </Typography>
                    <Typography variant="h6">
                      {formatDuration(analysis.totalTime)}
                    </Typography>
                  </Grid>
                )}
                
                {analysis.averageSpeed && (
                  <Grid item xs={6} sm={3}>
                    <Typography variant="body2" color="text.secondary">
                      Avg Speed
                    </Typography>
                    <Typography variant="h6">
                      {formatSpeed(analysis.averageSpeed)}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>

          {/* Elevation & Grade Stats */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Elevation & Grade Analysis
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={6} sm={4}>
                  <Typography variant="body2" color="text.secondary">
                    Min Elevation
                  </Typography>
                  <Typography variant="h6">
                    {formatElevation(analysis.minElevation)}
                  </Typography>
                </Grid>
                
                <Grid item xs={6} sm={4}>
                  <Typography variant="body2" color="text.secondary">
                    Max Elevation
                  </Typography>
                  <Typography variant="h6">
                    {formatElevation(analysis.maxElevation)}
                  </Typography>
                </Grid>
                
                <Grid item xs={6} sm={4}>
                  <Typography variant="body2" color="text.secondary">
                    Elevation Range
                  </Typography>
                  <Typography variant="h6">
                    {formatElevation(analysis.elevationRange)}
                  </Typography>
                </Grid>
                
                <Grid item xs={6} sm={4}>
                  <Typography variant="body2" color="text.secondary">
                    Average Grade
                  </Typography>
                  <Typography variant="h6">
                    {formatGrade(analysis.averageGrade)}
                  </Typography>
                </Grid>
                
                <Grid item xs={6} sm={4}>
                  <Typography variant="body2" color="text.secondary">
                    Max Grade
                  </Typography>
                  <Typography variant="h6">
                    {formatGrade(analysis.maxGrade)}
                  </Typography>
                </Grid>
                
                <Grid item xs={6} sm={4}>
                  <Typography variant="body2" color="text.secondary">
                    Min Grade
                  </Typography>
                  <Typography variant="h6">
                    {formatGrade(analysis.minGrade)}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Grade Distribution */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Grade Distribution
              </Typography>
              
              <Grid container spacing={2}>
                {/* Uphill Grades */}
                <Grid item xs={12} sm={6}>
                  <Typography variant="h6" gutterBottom color="primary">
                    Uphill
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {analysis.gradeDistribution.grade0To5Km > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">0-5%</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {formatDistance(analysis.gradeDistribution.grade0To5Km * 1000)}
                        </Typography>
                      </Box>
                    )}
                    {analysis.gradeDistribution.grade5To10Km > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">5-10%</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {formatDistance(analysis.gradeDistribution.grade5To10Km * 1000)}
                        </Typography>
                      </Box>
                    )}
                    {analysis.gradeDistribution.grade10To15Km > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">10-15%</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {formatDistance(analysis.gradeDistribution.grade10To15Km * 1000)}
                        </Typography>
                      </Box>
                    )}
                    {analysis.gradeDistribution.grade15To25Km > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">15-25%</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {formatDistance(analysis.gradeDistribution.grade15To25Km * 1000)}
                        </Typography>
                      </Box>
                    )}
                    {analysis.gradeDistribution.gradeOver25Km > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">&gt;25%</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {formatDistance(analysis.gradeDistribution.gradeOver25Km * 1000)}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Grid>

                {/* Downhill Grades */}
                <Grid item xs={12} sm={6}>
                  <Typography variant="h6" gutterBottom color="secondary">
                    Downhill
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {analysis.gradeDistribution.gradeNeg5To0Km > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">0 to -5%</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {formatDistance(analysis.gradeDistribution.gradeNeg5To0Km * 1000)}
                        </Typography>
                      </Box>
                    )}
                    {analysis.gradeDistribution.gradeNeg10ToNeg5Km > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">-5 to -10%</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {formatDistance(analysis.gradeDistribution.gradeNeg10ToNeg5Km * 1000)}
                        </Typography>
                      </Box>
                    )}
                    {analysis.gradeDistribution.gradeNeg15ToNeg10Km > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">-10 to -15%</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {formatDistance(analysis.gradeDistribution.gradeNeg15ToNeg10Km * 1000)}
                        </Typography>
                      </Box>
                    )}
                    {analysis.gradeDistribution.gradeNeg25ToNeg15Km > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">-15 to -25%</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {formatDistance(analysis.gradeDistribution.gradeNeg25ToNeg15Km * 1000)}
                        </Typography>
                      </Box>
                    )}
                    {analysis.gradeDistribution.gradeNegOver25Km > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">&lt;-25%</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {formatDistance(analysis.gradeDistribution.gradeNegOver25Km * 1000)}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Activity Metadata */}
          {(analysis.locationCity || analysis.startDate || analysis.kudosCount || analysis.achievementCount) && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  Activity Details
                </Typography>
                
                <Grid container spacing={3}>
                  {analysis.startDate && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Date
                      </Typography>
                      <Typography variant="body1">
                        {new Date(analysis.startDate).toLocaleDateString()}
                      </Typography>
                    </Grid>
                  )}
                  
                  {(analysis.locationCity || analysis.locationState) && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Location
                      </Typography>
                      <Typography variant="body1">
                        {[analysis.locationCity, analysis.locationState, analysis.locationCountry]
                          .filter(Boolean)
                          .join(', ')}
                      </Typography>
                    </Grid>
                  )}
                  
                  {analysis.kudosCount !== undefined && (
                    <Grid item xs={6} sm={3}>
                      <Typography variant="body2" color="text.secondary">
                        Kudos
                      </Typography>
                      <Typography variant="body1">
                        {analysis.kudosCount}
                      </Typography>
                    </Grid>
                  )}
                  
                  {analysis.achievementCount !== undefined && (
                    <Grid item xs={6} sm={3}>
                      <Typography variant="body2" color="text.secondary">
                        Achievements
                      </Typography>
                      <Typography variant="body1">
                        {analysis.achievementCount}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          )}

          {/* TODO: Add visualization components here */}
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Route Visualization
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Interactive route map and elevation graph will be added here using the unified visualization components.
              </Typography>
              {/* This will be implemented in the next step when we update the visualization components */}
            </CardContent>
          </Card>

        </Container>
      </Box>
    </Container>
  );
}