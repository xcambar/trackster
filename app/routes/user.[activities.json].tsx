import { ActionFunctionArgs, data } from "@remix-run/node";
import { getActivitiesForUser } from "~/lib/models/activity";
import { getUserFromSession } from "~/lib/models/user";
import { ensureAuthenticatedSession } from "~/services/session.server";

export const loader = async ({ request }: ActionFunctionArgs) => {
  const session = await ensureAuthenticatedSession(request);
  const user = await getUserFromSession(session);
  const activities = await getActivitiesForUser(user);

  return data(activities);
};
