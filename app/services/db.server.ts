import { drizzle } from "drizzle-orm/node-postgres";
import { getEnvironment } from "lib/environment";

export default drizzle({
  connection: getEnvironment("SUPABASE_DB_URL")!,
});
