import "dotenv/config";

import { defineConfig } from "drizzle-kit";
import { getEnvironment } from "@trackster/env";

export default defineConfig({
  out: "./drizzle",
  schema: "./packages/@trackster/db/schema.ts",
  dialect: "postgresql",
  casing: "snake_case",
  dbCredentials: {
    url: getEnvironment("SUPABASE_DB_URL"),
  },
});
