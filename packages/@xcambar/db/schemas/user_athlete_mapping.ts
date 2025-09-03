import { bigint, pgTable, uuid } from "drizzle-orm/pg-core";
import { authSchemaUsersTable } from "../supabase_schema";

export const userAthleteMappingTable = pgTable("user_athlete_mapping", {
  userId: uuid("user_id").references(() => authSchemaUsersTable.id),
  athleteId: bigint({ mode: "number" }),
});

export type UserAthleteMapping = typeof userAthleteMappingTable.$inferSelect;
export type NewUserAthleteMapping = typeof userAthleteMappingTable.$inferInsert;
