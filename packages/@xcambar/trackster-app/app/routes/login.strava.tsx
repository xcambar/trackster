import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticator } from "~/services/auth.server";

export const loader = async ({ request }: ActionFunctionArgs) => {
  await authenticator.authenticate("strava", request);
};
