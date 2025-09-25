import { AlertColor, Box, Container, Drawer } from "@mui/material";
import type { ActionFunctionArgs, MetaFunction } from "react-router";
import { data, redirect, useLoaderData } from "react-router";
import { useState } from "react";
import { ClientOnly } from "remix-utils/client-only";
import {
  ActivityList,
  ActivityListItemToggler,
} from "~/components/ActivityList";
import { AppBar } from "~/components/AppBar";
import { LeafletMap } from "~/components/leaflet/LeafletMap.client";
import { getActivitiesForUser } from "~/lib/models/activity";
import { getUserFromSession } from "~/lib/models/user";
import { ActivityMap } from "~/lib/types/activity";
import {
  commitSession,
  getCompleteUserSession,
  getSession,
} from "~/services/session.server";
import { FlashMessage } from "../components/FlashMessage";

export const meta: MetaFunction = () => {
  return [
    { title: "Map - Trackster" },
    { name: "description", content: "View your activities on the map" },
  ];
};

export const loader = async ({ request }: ActionFunctionArgs) => {
  const browserSession = await getSession(request.headers.get("Cookie"));
  const userSession = await getCompleteUserSession(request);

  // Redirect unauthenticated users to login
  if (userSession === null) {
    throw redirect("/login");
  }

  const activities = getActivitiesForUser(
    await getUserFromSession(userSession)
  );

  return data(
    {
      activities,
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
export default function Map() {
  const loaderData = useLoaderData<typeof loader>();
  const { activities } = loaderData;
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
        <AppBar showLogout={true} />
        <Container
          disableGutters
          maxWidth={false}
          sx={{ flexGrow: 1, overflow: "auto" }}
        >
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
        </Container>
      </Box>
    </Container>
  );
}
