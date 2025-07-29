import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { getEnvironment } from "../../lib/environment";
import Signin from "../components/Signin";
import { data, useLoaderData } from "@remix-run/react";
import {
  commitSession,
  getCompleteUserSession,
  getSession,
} from "~/services/session.server";
import LogoutIcon from "@mui/icons-material/Logout";
import PlaceIcon from "@mui/icons-material/Place";
import { getActivitiesForUser } from "~/lib/models/activity";
import { Activity } from "db/schema";

import {
  AlertColor,
  AppBar,
  Box,
  Container,
  Drawer,
  IconButton,
  Link,
  Toolbar,
  Typography,
} from "@mui/material";
import { FlashMessage } from "../components/FlashMessage";
import { LeafletMap } from "~/components/leaflet/LeafletMap.client";
import { ClientOnly } from "remix-utils/client-only";
import {
  ActivityList,
  ActivityListItemToggler,
} from "~/components/ActivityList";
import { getUserFromSession } from "~/lib/models/user";
import { useState } from "react";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export const loader = async ({ request }: ActionFunctionArgs) => {
  const browserSession = await getSession(request.headers.get("Cookie"));
  const userSession = await getCompleteUserSession(request);
  const isLoggedIn = userSession !== null;

  const activities = isLoggedIn
    ? getActivitiesForUser(await getUserFromSession(userSession))
    : Promise.resolve([] as Activity[]);

  return data(
    {
      activities,
      features: {
        FEATURE_EMAIL_LOGIN: getEnvironment("FEATURE_EMAIL_LOGIN"),
      },
      isLoggedIn,
      flash: {
        error: browserSession.get("error"),
        warning: browserSession.get("warning"),
        info: browserSession.get("info"),
        success: browserSession.get("success"),
      },
    },
    // this clears the flash messages
    { headers: { "Set-Cookie": await commitSession(browserSession) } }
  );
};

const drawerWidth = 360;

export type ActivityMap = {
  color: string;
  activity: Activity;
};

export default function Index() {
  const loaderData = useLoaderData<typeof loader>();
  const { activities } = loaderData;
  const enableEmail = loaderData.features.FEATURE_EMAIL_LOGIN === "true";
  const [mapsState, setMapsState] = useState<ActivityMap[]>([]);

  const toggleActivity: ActivityListItemToggler = (
    op,
    activity,
    options?: { color?: string }
  ) => {
    console.log(op, activity.id, mapsState.length);
    if (
      op === "add" &&
      mapsState.filter((map) => map.activity.id === activity.id).length === 0
    ) {
      return setMapsState([
        ...mapsState,
        {
          activity,
          color: options?.color as string,
        },
      ]);
    }
    if (op === "del")
      return setMapsState(
        mapsState.filter((map) => map.activity.id !== activity.id)
      );
  };

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
      <Box sx={{ display: "flex", flexDirection: "column", height: "100dvh" }}>
        <AppBar sx={{ flexGrow: 0 }} position="static">
          <Toolbar>
            <Link
              href="/"
              sx={{ display: "flex", alignItems: "center" }}
              color="inherit"
              underline="none"
            >
              <PlaceIcon sx={{ display: { xs: "none", md: "flex" }, mr: 1 }} />
              <Typography
                variant="h6"
                noWrap
                sx={{
                  mr: 2,
                  display: { xs: "none", md: "flex" },
                  fontFamily: "monospace",
                  fontWeight: 700,
                  letterSpacing: ".2rem",
                  color: "inherit",
                  textDecoration: "none",
                }}
              >
                Trackster
              </Typography>
            </Link>

            {/* This box acts as a spacer, it pushes the following elements on the right */}
            <Box
              sx={{ flexGrow: 1, display: { xs: "none", md: "flex" } }}
            ></Box>
            <Box sx={{ flexGrow: 0 }}>
              {loaderData.isLoggedIn && (
                <IconButton color="inherit" href="/logout">
                  <LogoutIcon />
                </IconButton>
              )}
            </Box>
          </Toolbar>
        </AppBar>
        <Container
          disableGutters
          maxWidth={false}
          sx={{ flexGrow: 1, overflow: "auto" }}
        >
          {loaderData.isLoggedIn ? (
            <Box sx={{ display: "flex", height: "100%" }}>
              <Drawer
                variant="permanent"
                sx={{
                  width: drawerWidth,
                  flexShrink: 0,
                  [`& .MuiDrawer-paper`]: {
                    width: drawerWidth,
                    boxSizing: "border-box",
                    position: "static",
                  },
                }}
              >
                <Box sx={{ overflow: "auto" }}>
                  <ActivityList
                    activities={activities}
                    onToggleActivity={toggleActivity}
                  />
                </Box>
              </Drawer>
              <ClientOnly>{() => <LeafletMap maps={mapsState} />}</ClientOnly>
            </Box>
          ) : (
            <Signin enableEmail={enableEmail} />
          )}
        </Container>
      </Box>
    </Container>
  );
}
