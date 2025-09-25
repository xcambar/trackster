import { ActionFunctionArgs, data } from "react-router";
import { getActivity } from "~/lib/models/activity";
import { getUserFromSession } from "~/lib/models/user";
import { ensureAuthenticatedSession } from "~/services/session.server";

export const loader = async ({ request, params }: ActionFunctionArgs) => {
  const session = await ensureAuthenticatedSession(request);
  const user = await getUserFromSession(session);
  const activity = await getActivity(Number(params.id), user);

  return data(activity);
};
