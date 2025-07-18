import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticator } from "~/services/auth.server";
import { getSession, commitSession } from "~/services/session.server";
import { redirect } from "~/lib/strava/oauth/lib/redirect";
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
        data: { strava: user },
      },
    }));
    if (error?.code === "user_already_exists") {
      // If the user already exists, we can just sign them in
      ({ data: supabaseUser, error } = await supabase.auth.signInWithPassword(
        supabaseCredentials
      ));
      if (error) {
        session.flash("error", "Login failed");
        console.error("Error signing in with Supabase:", error);
        return commitSessionAndRedirect(session);
      }
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
