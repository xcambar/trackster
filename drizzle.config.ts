import "dotenv/config";

import { getEnvironment } from "@xcambar/trackster-env";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./packages/@xcambar/db/schema.ts",
  dialect: "postgresql",
  casing: "snake_case",
  dbCredentials: {
    url: getEnvironment("SUPABASE_DB_URL"),
  },
});
