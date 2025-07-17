import { createCookieSessionStorage } from "@remix-run/node";
import { getEnvironment } from "~/lib/environment";
import { StravaProfile } from "~/lib/strava/oauth/strategy";

// Create a session storage
type SessionFlashData = {
  error: string; //red
  warning: string; //yellow
  info: string; //blue
  success: string; //green
};

export const { getSession, commitSession, destroySession } = createCookieSessionStorage<StravaProfile, SessionFlashData>({
  cookie: {
    name: "__session",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: [getEnvironment("COOKIE_SECRET")],
    secure: getEnvironment("NODE_ENV") === "production",
  },
});
