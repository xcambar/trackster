import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

import Signin from "../components/Signin";


import { Environment } from "../lib/environment"; // Adjust the import path as necessary
import { useLoaderData } from "@remix-run/react";

export const loader = async () => {
  return process.env;
}


export default function Index() {
  const loaderData = useLoaderData<Environment>();
  const enableEmail = loaderData.FEATURE_EMAIL_LOGIN === 'true';
  return <Signin enableEmail={enableEmail}/>;
}
