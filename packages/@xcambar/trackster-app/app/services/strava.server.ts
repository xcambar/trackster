export type { StravaRequestFn } from "~/lib/strava/api/scheduler";
import { AccessToken } from "strava";
import { StravaAPIScheduler } from "~/lib/strava/api/scheduler";

const schedulers = new Map<string, StravaAPIScheduler>();

export const buildStravaAPIScheduler = (
  token: AccessToken
): StravaAPIScheduler => {
  const actualToken = token.access_token;
  if (!schedulers.has(actualToken)) {
    schedulers.set(actualToken, new StravaAPIScheduler(token));
  }
  return schedulers.get(actualToken) as StravaAPIScheduler;
};
