import { AlertColor, Box, Container, Tab, Tabs } from "@mui/material";

import type { ActionFunctionArgs, MetaFunction } from "react-router";
import { data, Outlet, redirect, useLoaderData, useLocation, useNavigate } from "react-router";
import { AppBar } from "~/components/AppBar";

import { useEffect, useState } from "react";
import {
  commitSession,
  getCompleteUserSession,
  getSession,
} from "~/services/session.server";
import { FlashMessage } from "../components/FlashMessage";

export const meta: MetaFunction = () => {
  return [
    { title: "My Statistics - Trackster" },
    {
      name: "description",
      content: "View your activity statistics and performance metrics",
    },
  ];
};

export const loader = async ({ request }: ActionFunctionArgs) => {
  const browserSession = await getSession(request.headers.get("Cookie"));
  const userSession = await getCompleteUserSession(request);

  // Redirect unauthenticated users to login
  if (userSession === null) {
    throw redirect("/login");
  }

  return data(
    {
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

export default function Activities() {
  const loaderData = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  const [routeName, setRouteName] = useState(useLocation().pathname);
  useEffect(() => {
    if (routeName) navigate(routeName);
  }, [routeName, navigate]);

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
        <Container maxWidth="lg" sx={{ flexGrow: 1, overflow: "auto", py: 4 }}>
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs
              value={routeName}
              onChange={(ev, value) => setRouteName(value)}
              aria-label="basic tabs example"
            >
              <Tab value={"/statistics"} label="General" />
              <Tab value={"/statistics/run"} label="Run" />
              <Tab value={"/statistics/bike"} label="Bike" />
            </Tabs>
          </Box>
          <Outlet />
        </Container>
      </Box>
    </Container>
  );
}
