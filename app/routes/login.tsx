import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { data, redirect, useLoaderData } from "@remix-run/react";
import { getEnvironment } from "../../lib/environment";
import {
  commitSession,
  getCompleteUserSession,
  getSession,
} from "~/services/session.server";
import {
  AlertColor,
  Box,
  Container,
} from "@mui/material";
import { FlashMessage } from "../components/FlashMessage";
import Signin from "../components/Signin";
import { AppBar } from "~/components/AppBar";

export const meta: MetaFunction = () => {
  return [
    { title: "Login - Trackster" },
    { name: "description", content: "Sign in to your Trackster account" },
  ];
};

export const loader = async ({ request }: ActionFunctionArgs) => {
  const browserSession = await getSession(request.headers.get("Cookie"));
  const userSession = await getCompleteUserSession(request);
  
  // Redirect authenticated users to the map
  if (userSession !== null) {
    throw redirect("/map");
  }

  return data(
    {
      features: {
        FEATURE_EMAIL_LOGIN: getEnvironment("FEATURE_EMAIL_LOGIN"),
      },
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

export default function Login() {
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
        <AppBar showLogout={false} />
        <Container
          disableGutters
          maxWidth={false}
          sx={{ flexGrow: 1, overflow: "auto" }}
        >
          <Signin enableEmail={enableEmail} />
        </Container>
      </Box>
    </Container>
  );
}