import { createClient } from "@supabase/supabase-js";
import { getEnvironment } from "@trackster/env";

export const supabase = createClient(
  getEnvironment("SUPABASE_URL"),
  getEnvironment("SUPABASE_ANON_KEY")
);
