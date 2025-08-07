import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import { getEnvironment } from "./lib/environment";

export default defineConfig({
  out: "./drizzle",
  schema: "./db/schema.ts",
  dialect: "postgresql",
  casing: "snake_case",
  dbCredentials: {
    url: getEnvironment("SUPABASE_DB_URL"),
  },
});
