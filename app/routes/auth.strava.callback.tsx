import React from "react";
import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticator } from "~/services/auth.server";
import { useLoaderData } from "@remix-run/react";

export const loader = async ({ request }: ActionFunctionArgs) => {
  let user;
  try {
    user = await authenticator.authenticate("strava", request);
  } catch (error) {
    console.log("Error during Strava authentication:", error);
  }
  return user;
};

const PrettyPrint: React.FC = () => {
  const data = useLoaderData<typeof loader>();
  return (
    <div>
      <h1>Strava Authentication Callback</h1>
      <p>If you see this, the authentication process has been completed.</p>
      <code>{JSON.stringify(data, null, 2)}</code>
    </div>
  );
};

export default PrettyPrint;