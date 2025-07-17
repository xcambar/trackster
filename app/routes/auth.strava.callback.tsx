import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticator } from "~/services/auth.server";
import { getSession, commitSession } from "~/services/session.server";
import { redirect } from "~/lib/strava/oauth/lib/redirect";

export const loader = async ({ request }: ActionFunctionArgs) => {
  let user;
  const session = await getSession(request.headers.get("Cookie"));
  let headers = {};
  try {
    user = await authenticator.authenticate("strava", request);
    session.set("id", user.id);
    session.flash("success", "You are logged in successfully.");
  } catch (error) {
    console.log("Error during Strava authentication:", error);
    session.flash("warning", "Please login again.");
  }
  headers = {
    "Set-Cookie": await commitSession(session),
  };
  return redirect("/", { headers });
};