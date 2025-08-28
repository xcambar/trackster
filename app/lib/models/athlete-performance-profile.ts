import {
  athletePerformanceProfilesTable,
  type AthletePerformanceProfile,
} from "@xcambar/trackster-db/schemas/athlete_performance_profiles";
import { eq } from "drizzle-orm";
import db from "../../services/db.server";

/**
 * Get athlete performance profile by athlete ID
 */
export async function getAthletePerformanceProfile(
  athleteId: number
): Promise<AthletePerformanceProfile | null> {
  const profiles = await db
    .select()
    .from(athletePerformanceProfilesTable)
    .where(eq(athletePerformanceProfilesTable.athleteId, athleteId))
    .limit(1);

  return profiles[0] || null;
}
