import { Await, useFetcher } from "@remix-run/react";
import { convert } from "convert";
import { format } from "date-fns";
import { Activity } from "db/schema";
import React, { Suspense, useEffect, useState } from "react";

import {
  Avatar,
  Button,
  Checkbox,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Skeleton,
  ThemeProvider,
  Typography,
} from "@mui/material";
import { stravaTheme } from "./ConnectWithStrava";
import { StravaIcon } from "./CustomIcons";

import AutorenewIcon from "@mui/icons-material/Autorenew";
import CalendarIcon from "@mui/icons-material/CalendarMonth";
import BikeIcon from "@mui/icons-material/DirectionsBike";
import RunIcon from "@mui/icons-material/DirectionsRun";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import QuestionMarkIcon from "@mui/icons-material/QuestionMark";
import { pickCycleColor } from "~/lib/utils/cycle_color";

const ACTIVITIES_ROUTE = "/user/activities.json";

type ActivityListItemOp = "add" | "del";
export type ActivityListItemToggler = (
  op: ActivityListItemOp,
  activity: Activity,
  options?: ActivityListItemOptions
) => void;

type ActivityListProps = {
  activities: Promise<Activity[]>;
  onToggleActivity: ActivityListItemToggler;
};

function convertKmsToM(km: number) {
  const converted = convert(km, "m").to("km");
  return Math.round((converted + Number.EPSILON) * 100) / 100 + " km";
}

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

type ActivityListItemOptions = {
  color?: string;
};

const ActivityListItem: React.FC<{
  activity: Activity;
  onToggle: ActivityListItemToggler;
  options: ActivityListItemOptions;
}> = ({ activity, onToggle, options }) => {
  const [selected, setSelected] = useState(false);
  const [stravaActivity, setStravaActivity] = useState<Activity>();
  const toggleSelected = () => {
    const newState = !selected;
    setSelected(newState);
    if (newState === false && stravaActivity) {
      onToggle("del", stravaActivity);
    }
  };

  const fetcher = useFetcher();
  useEffect(() => {
    const data: Activity = fetcher.data as Activity;
    if (data) {
      setStravaActivity(data);
    }
  }, [fetcher]);
  useEffect(() => {
    if (stravaActivity && selected) {
      onToggle("add", stravaActivity, { ...options });
    }
  }, [stravaActivity, selected, onToggle, options]);
  return (
    <ListItem
      onClick={() => fetcher.load(`/user/activities.json/${activity.id}`)}
      dense
      disablePadding
      secondaryAction={
        <IconButton edge="end">
          <Avatar
            sx={{
              bgcolor: selected ? options.color || "primary.main" : "primary",
            }}
          >
            {activity.sportType === "Run" && <RunIcon />}
            {activity.sportType === "Ride" && <BikeIcon />}
            {!["Run", "Ride"].includes(activity.sportType) && (
              <QuestionMarkIcon />
            )}
          </Avatar>
        </IconButton>
      }
    >
      <ListItemButton selected={selected} onClick={toggleSelected}>
        <ListItemIcon sx={{ minWidth: "inherit" }}>
          <Checkbox
            checked={selected}
            edge="start"
            sx={{ paddingTop: 0, top: "-.5em" }}
          ></Checkbox>
        </ListItemIcon>
        <ListItemText
          disableTypography
          primary={
            <Typography variant="body1" noWrap>
              {activity.name}
            </Typography>
          }
          secondary={
            <>
              <Chip
                icon={<CalendarIcon />}
                size="small"
                label={
                  activity.startDate
                    ? format(activity.startDate, "yyyy-MM-dd")
                    : "?"
                }
              />
              &nbsp;
              <Chip
                icon={<EmojiEventsIcon />}
                size="small"
                label={convertKmsToM(activity.distance)}
              />
            </>
          }
        />
      </ListItemButton>
    </ListItem>
  );
};

export const ActivityList: React.FC<ActivityListProps> = ({
  activities: activitiesPromise,
  onToggleActivity,
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
        My activities
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
              activities.map((activity, id) => (
                <ActivityListItem
                  key={activity.id}
                  activity={activity}
                  options={{ color: pickCycleColor(id) }}
                  onToggle={onToggleActivity}
                />
              ))
            )
          }
        </Await>
      </Suspense>
    </List>
  );
};
