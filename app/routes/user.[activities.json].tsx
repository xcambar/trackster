import { ActionFunctionArgs, data } from "@remix-run/node";
import { getActivitiesForUser } from "~/lib/models/activity";
import { ensureAuthenticatedSession } from "~/services/session.server";

export const loader = async ({ request }: ActionFunctionArgs) => {
  await ensureAuthenticatedSession(request);
  const activities = await getActivitiesForUser(123);

  return data(activities);
};
