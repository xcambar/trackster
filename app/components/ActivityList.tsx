import React from "react";
import {
  List,
  ListSubheader,
  ListItem,
  ListItemText,
  Typography,
  Button,
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

type Activity = {
  type: "run" | "bike";
  title: string;
};
const mockActivities: Activity[] = [
  { type: "run", title: "Morning run" },
  { type: "run", title: "5k training" },
  { type: "bike", title: "HIIT" },
  { type: "run", title: "5k training" },
  { type: "bike", title: "Long distance" },
  { type: "run", title: "Morning run" },
  { type: "run", title: "Slow run" },
];

type ActivityListItemsProps = {
  activity: Activity;
};
const ActivityListItem: React.FC<ActivityListItemsProps> = ({ activity }) => {
  return (
    <ListItem
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
  );
};

export const ActivityList: React.FC = () => {
  const [loading, setLoading] = React.useState(false);
  const [activities, setActivities] = React.useState<typeof mockActivities>([]);
  const handleLoadFromStravaClick = () => {
    setLoading(true);
    setTimeout(() => {
      setActivities(mockActivities);
    }, 1000);
  };

  return (
    <List>
      <ListSubheader>Your activities</ListSubheader>
      {activities.length === 0 ? (
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
                startIcon={loading ? null : <StravaIcon variant="white" />}
              >
                Load from Strava
              </Button>
            </ThemeProvider>
          </ListItem>
        </>
      ) : (
        activities.map((activity) => (
          <ActivityListItem key={activity} activity={activity} />
        ))
      )}
    </List>
  );
};
