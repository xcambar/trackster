import React, { Suspense, useEffect, useState } from "react";
import { Await, useFetcher } from "@remix-run/react";

import {
  List,
  ListSubheader,
  ListItem,
  ListItemText,
  Typography,
  Button,
  Skeleton,
  ThemeProvider,
  ListItemIcon,
  Checkbox,
  IconButton,
  Avatar,
} from "@mui/material";
import { StravaIcon } from "./CustomIcons";
import { stravaTheme } from "./ConnectWithStrava";

import BikeIcon from "@mui/icons-material/DirectionsBike";
import RunIcon from "@mui/icons-material/DirectionsRun";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import { Activity } from "~/lib/models/activity";

const ACTIVITIES_ROUTE = "/user/activities.json";

type ActivityListProps = {
  activities: Promise<Activity[]>;
};

const ListItemSkeleton = () => {
  return (
    <>
      {Array.from(new Array(4)).map((_, idx) => (
        <ListItem
          key={`loading-${idx}`}
          secondaryAction={
            <IconButton edge="end" aria-label="comments">
              <Avatar>
                <Skeleton variant="circular" />
              </Avatar>
            </IconButton>
          }
        >
          <ListItemIcon sx={{ minWidth: "inherit" }}>
            <Checkbox edge="start"></Checkbox>
          </ListItemIcon>
          <ListItemText
            disableTypography
            primary={
              <Typography variant="body1">
                <Skeleton variant="rectangular" width="65%" />
              </Typography>
            }
            secondary={
              <Typography variant="body2">
                <Skeleton variant="rectangular" width="50%" />
              </Typography>
            }
          />
        </ListItem>
      ))}
    </>
  );
};

export const ActivityList: React.FC<ActivityListProps> = ({
  activities: activitiesPromise,
}) => {
  const activitiesFetcher = useFetcher<Activity[]>();

  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    activitiesPromise.then((newActivities) => {
      setLoading(false);
      setActivities(() => newActivities);
    });
    return () => undefined;
  }, [activitiesPromise]);

  useEffect(() => {
    const { state, data } = activitiesFetcher;
    setLoading(state === "loading");
    if (data) {
      setActivities(() => [...(data as Activity[])]);
    }
  }, [activitiesFetcher]);

  const handleLoadFromStravaClick = () => {
    activitiesFetcher.load(ACTIVITIES_ROUTE);
  };

  return (
    <List>
      <ListSubheader>
        Your activities
        <IconButton
          sx={{ float: "right" }}
          disableRipple
          loading={loading}
          onClick={handleLoadFromStravaClick}
        >
          <AutorenewIcon />
        </IconButton>
      </ListSubheader>
      <Suspense fallback={<ListItemSkeleton />}>
        <Await resolve={activitiesPromise}>
          {() =>
            activities.length === 0 ? (
              <>
                <ListItem key="empty_list">
                  <ListItemText>
                    <Typography
                      variant="subtitle1"
                      color="grey"
                      sx={{ fontStyle: "italic" }}
                    >
                      No activity available
                    </Typography>
                  </ListItemText>
                </ListItem>
                <ListItem key="load_from_strava">
                  <ThemeProvider theme={stravaTheme}>
                    <Button
                      fullWidth
                      loading={loading}
                      color="strava"
                      variant="contained"
                      size="small"
                      onClick={handleLoadFromStravaClick}
                      startIcon={
                        loading ? null : <StravaIcon variant="white" />
                      }
                    >
                      Load from Strava
                    </Button>
                  </ThemeProvider>
                </ListItem>
              </>
            ) : (
              activities.map((activity) => (
                <ListItem
                  key={activity.id}
                  dense
                  secondaryAction={
                    <IconButton edge="end" aria-label="comments">
                      <Avatar>
                        {activity.type === "run" && <RunIcon />}
                        {activity.type === "bike" && <BikeIcon />}
                      </Avatar>
                    </IconButton>
                  }
                >
                  <ListItemIcon sx={{ minWidth: "inherit" }}>
                    <Checkbox edge="start"></Checkbox>
                  </ListItemIcon>
                  <ListItemText
                    disableTypography
                    primary={
                      <Typography variant="body1" noWrap>
                        {activity.title}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="body2" color="text.secondary">
                        Now
                      </Typography>
                    }
                  />
                </ListItem>
              ))
            )
          }
        </Await>
      </Suspense>
    </List>
  );
};
