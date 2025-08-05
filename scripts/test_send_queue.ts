import dotenv from "dotenv";
import { SupabaseQueue } from "lib/supabase/queue";

dotenv.config();

const queue = new SupabaseQueue({
  queue: "strava_api",
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SECRET_KEY,
});

const payload = { hello: "world" };

try {
  // const result = await queue.push(payload);
  const result = await queue.pull<typeof payload>();
  console.log(result.data?.[0]?.message.hello);
  console.log(result);
} catch (e) {
  console.log(e);
}
