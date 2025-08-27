import { getEnvironment } from "@trackster/env";
import { drizzle } from "drizzle-orm/node-postgres";

export default drizzle({
  connection: getEnvironment("SUPABASE_DB_URL")!,
});
