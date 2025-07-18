import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { getEnvironment } from "../lib/environment";
import Signin from "../components/Signin";
import { data, useLoaderData } from "@remix-run/react";
import { commitSession, getSession } from "~/services/session.server";
import LogoutIcon from "@mui/icons-material/Logout";
import PlaceIcon from "@mui/icons-material/Place";

import {
  AlertColor,
  AppBar,
  Box,
  Container,
  IconButton,
  Link,
  Toolbar,
  Typography,
} from "@mui/material";
import { FlashMessage } from "../components/FlashMessage";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

const checkAuthentication = async (request: Request) => {
  const session = await getSession(request.headers.get("Cookie"));
  return session.has("id");
};

export const loader = async ({ request }: ActionFunctionArgs) => {
  const session = await getSession(request.headers.get("Cookie"));
  return data(
    {
      features: {
        FEATURE_EMAIL_LOGIN: getEnvironment("FEATURE_EMAIL_LOGIN"),
      },
      isLoggedIn: await checkAuthentication(request),
      flash: {
        error: session.get("error"),
        warning: session.get("warning"),
        info: session.get("info"),
        success: session.get("success"),
      },
    },
    {
      headers: { "Set-Cookie": await commitSession(session) },
    }
  );
};

export default function Index() {
  const loaderData = useLoaderData<typeof loader>();
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

            <Box
              sx={{ flexGrow: 1, display: { xs: "none", md: "flex" } }}
            ></Box>
            <Box sx={{ flexGrow: 0 }}>
              {loaderData.isLoggedIn && (
                <IconButton href="/logout">
                  <LogoutIcon />
                </IconButton>
              )}
            </Box>
          </Toolbar>
        </AppBar>
        <Container maxWidth={false} sx={{ flexGrow: 1, overflow: "auto" }}>
          {loaderData.isLoggedIn ? (
            <p>You are already logged in.</p>
          ) : (
            <Signin enableEmail={enableEmail} />
          )}
        </Container>
      </Box>
    </Container>
  );
}
