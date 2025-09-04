import type { ActionFunctionArgs } from "@remix-run/node";
import { redirect } from "~/lib/strava/oauth/lib/redirect";
import { authenticator } from "~/services/auth.server";
import { commitSession, getSession } from "~/services/session.server";
import { supabase } from "~/services/supabase.server";

async function commitSessionAndRedirect(
  session: Awaited<ReturnType<typeof getSession>>,
  url: string = "/"
) {
  return redirect(url, {
    headers: {
      "Set-Cookie": await commitSession(session),
    },
  });
}

export const loader = async ({ request }: ActionFunctionArgs) => {
  let user;
  const session = await getSession(request.headers.get("Cookie"));
  try {
    let supabaseUser, error;
    user = await authenticator.authenticate("strava", request);
    const supabaseCredentials = {
      email: `${user.id}@strava.oauth.auto`,
      password: `${user.id}-${user.created_at}|strava.oauth.auto`,
    };
    ({ data: supabaseUser, error } = await supabase.auth.signUp({
      ...supabaseCredentials,
      options: {
        data: { strava_profile: user },
      },
    }));
    if (error?.code === "user_already_exists") {
      // If the user already exists, we can just sign them in
      ({ data: supabaseUser, error } =
        await supabase.auth.signInWithPassword(supabaseCredentials));
    }
    const existingToken =
      supabaseUser?.user?.user_metadata?.strava_profile?.token;

    if (
      !existingToken ||
      //eslint-disable-next-line @typescript-eslint/no-explicit-any
      (user.token as any).expires_at > existingToken.expires_at
    ) {
      // If the Strava token is newer, update it in Supabase
      const { error } = await supabase.auth.updateUser({
        data: { strava_profile: user },
      });
      if (error) {
        console.error("Error updating user in Supabase:", error);
      }
    }
    if (error) {
      session.flash("error", "Login failed");
      console.error("Error signing in with Supabase:", error);
      return commitSessionAndRedirect(session);
    }

    if (supabaseUser?.user) {
      session.set("id", supabaseUser.user.id);
    }
    session.flash("success", "You are logged in successfully.");
  } catch (error) {
    console.log("Error during Strava authentication:", error);
    session.flash("warning", "Please login again.");
  }
  return commitSessionAndRedirect(session);
};
