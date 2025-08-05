import "dotenv/config";
import { getStravaAPIClient } from "~/lib/strava/api";

const token = {
  expires_at: 1753720301,
  expires_in: 21600,
  token_type: "Bearer",
  access_token: "e7507731bdbfc98d01dc20d55357ba4b7bf8446d",
  refresh_token: "151e94e3e068d4876e4e4a8bd0c808f7f29d4d67",
};

const client = getStravaAPIClient(token);

await client.activities.getLoggedInAthleteActivities();
