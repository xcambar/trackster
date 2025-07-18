import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { getEnvironment } from "../lib/environment";
import Signin from "../components/Signin";
import { data, useLoaderData } from "@remix-run/react";
import { commitSession, getSession } from "~/services/session.server";
import { AlertColor } from "@mui/material";
import { FlashMessage } from "../components/FlashMessage";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

const checkAuthentication = async (request: Request) => {
  const session = await getSession(request.headers.get("Cookie"));
  return session.has("id");
};

export const loader = async ({ request }: ActionFunctionArgs) => {
  const session = await getSession(request.headers.get("Cookie"));
  return data(
    {
      features: {
        FEATURE_EMAIL_LOGIN: getEnvironment("FEATURE_EMAIL_LOGIN"),
      },
      isLoggedIn: await checkAuthentication(request),
      flash: {
        error: session.get("error"),
        warning: session.get("warning"),
        info: session.get("info"),
        success: session.get("success"),
      },
    },
    {
      headers: { "Set-Cookie": await commitSession(session) },
    }
  );
};

export default function Index() {
  const loaderData = useLoaderData<typeof loader>();
  const enableEmail = loaderData.features.FEATURE_EMAIL_LOGIN === "true";
  return (
    <>
      {Object.entries(loaderData.flash).map(
        ([severity, message]) =>
          message && (
            <FlashMessage
              key={`${severity}-${message}`}
              severity={severity as AlertColor}
              message={message}
            />
          )
      )}
      {loaderData.isLoggedIn ? (
        <p>You are already logged in.</p>
      ) : (
        <Signin enableEmail={enableEmail} />
      )}
    </>
  );
}
