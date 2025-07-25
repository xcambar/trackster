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
import { Activity, getActivitiesForUser } from "~/lib/models/activity";

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
import { ActivityList } from "~/components/ActivityList";
import { getUserFromSession } from "~/lib/models/user";

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

  return data({
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
  });
};

const drawerWidth = 360;

export default function Index() {
  const loaderData = useLoaderData<typeof loader>();
  const { activities } = loaderData;
  const enableEmail = loaderData.features.FEATURE_EMAIL_LOGIN === "true";
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
                  <ActivityList activities={activities} />
                </Box>
              </Drawer>
              <ClientOnly>{() => <LeafletMap />}</ClientOnly>
            </Box>
          ) : (
            <Signin enableEmail={enableEmail} />
          )}
        </Container>
      </Box>
    </Container>
  );
}
