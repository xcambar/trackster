import { redirect, type ActionFunctionArgs } from "react-router";
import { destroySession, getSession } from "~/services/session.server";

export const loader = async ({ request }: ActionFunctionArgs) => {
  const session = await getSession(request.headers.get("Cookie"));
  return redirect("/", {
    headers: {
      "Set-Cookie": await destroySession(session),
    },
  });
};
