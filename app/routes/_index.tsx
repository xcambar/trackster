import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { redirect } from "@remix-run/react";
import { getCompleteUserSession } from "~/services/session.server";

export const meta: MetaFunction = () => {
  return [
    { title: "Trackster" },
    { name: "description", content: "Track your running and cycling activities" },
  ];
};

export const loader = async ({ request }: ActionFunctionArgs) => {
  const userSession = await getCompleteUserSession(request);
  
  // Redirect based on authentication status
  if (userSession !== null) {
    throw redirect("/map");
  } else {
    throw redirect("/login");
  }
};
