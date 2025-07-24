import { createCookieSessionStorage, Session } from "@remix-run/node";
import { getEnvironment } from "lib/environment";
import { supabase } from "./supabase.server";

// Create a session storage
type SessionFlashData = {
  error: string; //red
  warning: string; //yellow
  info: string; //blue
  success: string; //green
};

type UserSessionData = {
  id: string | number;
};

export type UserSession = Session<UserSessionData, SessionFlashData>;

const { getSession, commitSession, destroySession } =
  createCookieSessionStorage<UserSessionData, SessionFlashData>({
    cookie: {
      name: "__session",
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secrets: [getEnvironment("COOKIE_SECRET")],
      secure: getEnvironment("NODE_ENV") === "production",
    },
  });

export { getSession, commitSession, destroySession };

export const isAuthenticated = async (request: Request) => {
  const session = await getSession(request.headers.get("Cookie"));
  return session.has("id") && (await supabase.auth.getSession())?.data.session;
};

export type CompleteSession = {
  browserSession: Awaited<ReturnType<typeof getSession>>;
  supabaseSession: Awaited<
    ReturnType<typeof supabase.auth.getSession>
  >["data"]["session"];
};

export const getCompleteUserSession = async (
  request: Request
): Promise<null | CompleteSession> => {
  // Remix Session check
  const browserSession = await getSession(request.headers.get("Cookie"));

  // Supabase session check
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (!browserSession.has("id") || error || !session) {
    return null;
  }
  return { browserSession: browserSession, supabaseSession: session };
};

export const ensureAuthenticatedSession = async (
  request: Request
): Promise<CompleteSession> => {
  // Remix Session check
  const browserSession = await getSession(request.headers.get("Cookie"));

  // Supabase session check
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (!browserSession.has("id") || error || !session) {
    throw new Response("Not Found", {
      status: 404,
      headers: { "Set-Cookie": await destroySession(browserSession) },
    });
  }
  return { browserSession: browserSession, supabaseSession: session };
};
