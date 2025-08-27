// tslint:disable:ordered-imports
import "dotenv/config";
import { buildAthleteProfile } from "@trackster/db/buildAthletePerformanceProfiles";

const athleteId = 147083611;
await buildAthleteProfile(athleteId)
  .then(() => console.log(`Profile built for athlete ${athleteId}`))
  .catch(console.error)
  .finally(() => process.exit(0));
