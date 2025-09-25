import { Box, Paper, Typography } from "@mui/material";
import { ActionFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { Activity } from "@xcambar/trackster-db";
import { ActivityTypeIcon } from "~/components/ActivityTypeIcon";
import { getLastActivityForUser } from "~/lib/models/activity";
import { getUserFromSession } from "~/lib/models/user";

import {
  formatDistance,
  formatPace,
  formatRelativeTime,
} from "~/lib/utils/grade-analysis";
import { getCompleteUserSession } from "~/services/session.server";

export const loader = async ({ request }: ActionFunctionArgs) => {
  const userSession = await getCompleteUserSession(request);

  const user = await getUserFromSession(userSession!);
  const lastActivity = await getLastActivityForUser(user);
  return {
    lastActivity,
  };
};

function LastActivityCard({ activity }: { activity: Activity | null }) {
  if (!activity) {
    return (
      <Paper elevation={2} sx={{ p: 3, textAlign: "center", height: "100%" }}>
        <Typography variant="h6" gutterBottom>
          Latest Activity
        </Typography>
        <Typography variant="body1" color="text.secondary">
          No activities found
        </Typography>
      </Paper>
    );
  }

  const pace = activity.averageSpeed ? 1000 / activity.averageSpeed / 60 : 0;

  return (
    <Paper elevation={2} sx={{ p: 3, textAlign: "center" }}>
      <Typography variant="h6" gutterBottom>
        Latest Activity
      </Typography>
      <Typography variant="h4" color="primary" gutterBottom>
        {activity.name}
        <ActivityTypeIcon
          avatarProps={{
            sx: {
              display: "inline-flex",
              ml: 1,
              bgcolor: "primary.main",
            },
          }}
          sportType={activity.sportType}
        />
      </Typography>
      <Typography variant="body1" gutterBottom>
        <strong>Date:</strong>{" "}
        {activity.startDateLocal
          ? new Date(activity.startDateLocal).toLocaleDateString()
          : "N/A"}
      </Typography>
      <Typography variant="body1" gutterBottom>
        <strong>Distance:</strong> {formatDistance(activity.distance)}
      </Typography>
      <Typography variant="body1">
        <strong>Average Pace:</strong> {formatPace(pace)} /km
      </Typography>
    </Paper>
  );
}

function TimeSinceLastActivityCard({
  activity,
}: {
  activity: Activity | null;
}) {
  const timeSince = activity?.startDateLocal
    ? formatRelativeTime(new Date(activity.startDateLocal))
    : "N/A";

  return (
    <Paper elevation={2} sx={{ p: 3, textAlign: "center", height: "100%" }}>
      <Typography variant="h6" gutterBottom>
        Time Since Last Activity
      </Typography>
      <Typography variant="h3" color="primary" gutterBottom>
        {timeSince}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Keep up the momentum!
      </Typography>
    </Paper>
  );
}

export default function StatisticsIndex() {
  const loaderData = useLoaderData<typeof loader>();
  const { lastActivity } = loaderData;

  return (
    <>
      <Typography variant="h3" component="h1" gutterBottom sx={{ mb: 4 }}>
        My Statistics
      </Typography>

      {/* Statistics Cards */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 3,
          mb: 4,
        }}
      >
        <Box sx={{ flex: 1 }}>
          <TimeSinceLastActivityCard activity={lastActivity} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <LastActivityCard activity={lastActivity} />
        </Box>
      </Box>
    </>
  );
}
