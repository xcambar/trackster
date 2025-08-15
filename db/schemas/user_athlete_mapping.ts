import { bigint, pgSchema, pgTable, uuid } from "drizzle-orm/pg-core";

const mySchema = pgSchema("auth");

const authSchemaUsers = mySchema.table("users", {
  id: uuid("id").primaryKey(),
});

export const userAthleteMappingTable = pgTable("user_athlete_mapping", {
  userId: uuid("user_id").references(() => authSchemaUsers.id),
  athleteId: bigint({ mode: "number" }),
});

export type UserAthleteMapping = typeof userAthleteMappingTable.$inferSelect;
export type NewUserAthleteMapping = typeof userAthleteMappingTable.$inferInsert;
