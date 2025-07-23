import { createClient } from "@supabase/supabase-js";
import { getEnvironment } from "lib/environment";

export const supabase = createClient(
  getEnvironment("SUPABASE_URL"),
  getEnvironment("SUPABASE_ANON_KEY")
);
