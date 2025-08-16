// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

export function makeSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

Deno.serve(async (req) => {
  const { method, url } = req;
  const pattern = new URLPattern({ pathname: "/reconcile-athlete-data/:id" });
  const matchingPath = pattern.exec(url);
  const athleteId = matchingPath?.pathname.groups.id;

  if (method !== "GET") {
    return new Response(null, { status: 405 });
  }

  if (!athleteId) {
    return new Response(null, { status: 404 });
  }

  return await handle(athleteId);
});

async function handle(athleteId: string) {
  const supabase = makeSupabaseClient();
  const { data, error } = await supabase
    .from("user_athlete_mapping")
    .select("user_id")
    .eq("athlete_id", athleteId)
    .single();

  if (error) {
    return new Response(`${error.message}, ${error.details}`, { status: 500 });
  }
  if (!data.user_id) {
    return new Response(`Athlete ${athleteId} not found`, { status: 404 });
  }

  const userTokenResult = (await supabase.auth.admin.getUserById(data.user_id))
    .data.user?.user_metadata.strava_profile.token;

  const responseData = {
    user: userTokenResult,
    athleteId,
  };

  return new Response(JSON.stringify(responseData), {
    headers: { "Content-Type": "application/json" },
  });
}

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/reconcile-athlete-data' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
