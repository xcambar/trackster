import type { MetaFunction } from "@remix-run/node";
import { getEnvironment, EnvironmentVariables } from "../lib/environment";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

import Signin from "../components/Signin";


import { useLoaderData } from "@remix-run/react";

export const loader = async () => {
  return {
    FEATURE_EMAIL_LOGIN: getEnvironment("FEATURE_EMAIL_LOGIN")
  };
}


export default function Index() {
  const loaderData = useLoaderData<EnvironmentVariables>();
  const enableEmail = loaderData.FEATURE_EMAIL_LOGIN === 'true';
  return <Signin enableEmail={enableEmail}/>;
}
