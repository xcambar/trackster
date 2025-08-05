import "dotenv/config";

import { populateActivitiesFromAPI } from "db/populateActivitiesFromStravaAPI";
import { populateActivityStreamsFromAPI } from "db/populateActivityStreamsFromStravaAPI";
import { buildAthleteProfile } from "../db/buildAthletePerformanceProfiles";

const token = {
  expires_at: 1753720301,
  expires_in: 21600,
  token_type: "Bearer",
  access_token: "e7507731bdbfc98d01dc20d55357ba4b7bf8446d",
  refresh_token: "151e94e3e068d4876e4e4a8bd0c808f7f29d4d67",
};

try {
  const activities = await populateActivitiesFromAPI(token);
  const athleteId = activities[0]?.athleteId;
  const activityIds = activities.map(({ id }) => id);

  for (const activity of activityIds) {
    await populateActivityStreamsFromAPI(token, activity);
  }

  await buildAthleteProfile(athleteId as number);
} catch (err) {
  const response = err as Response;
  let message;
  switch (response.status) {
    case 429:
      message = `[STRAVA|API] Rate limit hit on ${response.url}. Cannot proceed`;
      break;
    default:
      message = `Error ${response.status}: ${response.statusText} on ${response.url}`;
  }
  console.log(message);
}
