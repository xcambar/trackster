import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { getEnvironment } from "../lib/environment";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

import Signin from "../components/Signin";


import { useLoaderData } from "@remix-run/react";
import { getSession } from "~/services/session.server";

const checkAuthentication = async (request: Request) => {
  const session = await getSession(request.headers.get("Cookie"));
  return session.has("id") ;
}

export const loader = async ({ request }: ActionFunctionArgs) => {
  return {
    features: {
      FEATURE_EMAIL_LOGIN: getEnvironment("FEATURE_EMAIL_LOGIN"),
    },
    isLoggedIn: await checkAuthentication(request)
  };
}


export default function Index() {
  const loaderData = useLoaderData<typeof loader>();
  const enableEmail = loaderData.features.FEATURE_EMAIL_LOGIN === 'true';
  if (loaderData.isLoggedIn) {
    return <p>You are already logged in.</p>;
  }
  return <Signin enableEmail={enableEmail}/>;
}
