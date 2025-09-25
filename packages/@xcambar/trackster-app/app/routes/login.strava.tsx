import type { ActionFunctionArgs } from "react-router";
import { authenticator } from "~/services/auth.server";

export const loader = async ({ request }: ActionFunctionArgs) => {
  await authenticator.authenticate("strava", request);
};
