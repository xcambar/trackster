import { json, pgSchema, uuid } from "drizzle-orm/pg-core";

const mySchema = pgSchema("auth");
export const authSchemaUsersTable = mySchema.table("users", {
  id: uuid("id").primaryKey(),
  userMetadata: json("raw_user_meta_data"),
});

export type AuthSchemaUsers = typeof authSchemaUsersTable.$inferSelect;
export type NewAuthSchemaUsers = typeof authSchemaUsersTable.$inferInsert;
