/// <reference lib="deno.ns" />
// Supabase Edge Function for Strava Webhook handling
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

console.log("Strava Webhook Function started");

// Database setup using Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req: Request) => {
  const method = req.method;

  // Handle webhook verification (GET request)
  if (method === "GET") {
    const url = new URL(req.url);
    const hubMode = url.searchParams.get("hub.mode");
    const hubChallenge = url.searchParams.get("hub.challenge");
    const hubVerifyToken = url.searchParams.get("hub.verify_token");

    console.log("Webhook verification request:", {
      mode: hubMode,
      challenge: hubChallenge,
      verifyToken: hubVerifyToken,
    });

    // Verify the challenge for webhook subscription
    if (hubMode === "subscribe" && hubChallenge) {
      return new Response(JSON.stringify({ "hub.challenge": hubChallenge }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Bad Request", { status: 400 });
  }

  // Handle webhook events (POST request)
  if (method === "POST") {
    try {
      const payload = await req.json();

      console.log(
        "Strava webhook payload received:",
        JSON.stringify(payload, null, 2),
      );

      // Extract common webhook fields
      const {
        object_type,
        object_id,
        aspect_type,
        owner_id,
        subscription_id,
        event_time,
        updates,
      } = payload;

      // First, log the webhook event to our tracking table
      try {
        const { error } = await supabase
          .from("webhook_events")
          .insert({
            object_type: object_type,
            object_id: object_id,
            aspect_type: aspect_type,
            owner_id: owner_id,
            subscription_id: subscription_id,
            event_time: new Date(event_time * 1000).toISOString(),
            updates: updates || {},
            processed: false,
          });

        if (error) {
          console.error("Failed to log webhook event:", error);
        }
      } catch (error) {
        console.error("Failed to log webhook event:", error);
      }

      // Handle activity-specific events
      if (object_type === "activity") {
        switch (aspect_type) {
          case "create":
            try {
              console.log(
                `🚀 Processing activity creation for ID: ${object_id}`,
              );

              // Get user's Strava access token from our database
              // For now, we'll use a placeholder token - in a real implementation:
              // 1. Look up the athlete's access token based on owner_id
              // 2. Refresh the token if needed
              const userTokenResult = await supabase
                .from("auth.users")
                .select("raw_user_meta_data")
                .eq("raw_user_meta_data->>strava_id", owner_id)
                .single();

              if (userTokenResult.error || !userTokenResult.data) {
                console.error(`No user found for owner_id: ${owner_id}`);
                return new Response(`User ${owner_id} not found`, {
                  status: 404,
                });
              }

              const stravaToken = userTokenResult.data.raw_user_meta_data
                ?.access_token;
              if (!stravaToken) {
                console.error(
                  `No Strava token found for owner_id: ${owner_id}`,
                );
                return new Response("Not Found", { status: 404 });
              }

              // Fetch the full activity data from Strava API
              console.log(`� Fetching activity  ${object_id} from Strava API`);
              const stravaResponse = await fetch(
                `https://www.strava.com/api/v3/activities/${object_id}`,
                {
                  headers: {
                    "Authorization": `Bearer ${stravaToken}`,
                    "Accept": "application/json",
                  },
                },
              );

              if (!stravaResponse.ok) {
                console.error(
                  `Failed to fetch activity from Strava: ${stravaResponse.status} ${stravaResponse.statusText}`,
                );
                return new Response(
                  `Failed to fetch activity from Strava: ${stravaResponse.status} ${stravaResponse.statusText}`,
                  { status: 404 },
                );
              }

              const activityData = await stravaResponse.json();
              console.log(`📥 Retrieved activity data: ${activityData.name}`);

              // Transform and insert the activity into our database
              const newActivity = {
                id: activityData.id,
                athlete_id: activityData.athlete.id,
                name: activityData.name,
                distance: activityData.distance || 0,
                moving_time: activityData.moving_time,
                elapsed_time: activityData.elapsed_time,
                total_elevation_gain: activityData.total_elevation_gain,
                sport_type: activityData.sport_type || activityData.type,
                start_date: activityData.start_date,
                start_date_local: activityData.start_date_local,
                timezone: activityData.timezone,
                start_latlng: activityData.start_latlng,
                end_latlng: activityData.end_latlng,
                location_city: activityData.location_city,
                location_state: activityData.location_state,
                location_country: activityData.location_country,
                map: activityData.map,
                trainer: activityData.trainer || false,
                commute: activityData.commute || false,
                manual: activityData.manual || false,
                private: activityData.private || false,
                flagged: activityData.flagged || false,
                average_speed: activityData.average_speed || 0,
                max_speed: activityData.max_speed,
                average_cadence: activityData.average_cadence,
                average_watts: activityData.average_watts,
                max_watts: activityData.max_watts,
                has_heartrate: activityData.has_heartrate || false,
                calories: activityData.calories,
                description: activityData.description,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };

              // Insert the activity into our database
              const { error: insertError } = await supabase
                .from("activities")
                .insert(newActivity);

              if (insertError) {
                console.error("Failed to insert activity:", insertError);
                return new Response("Internal error", { status: 500 });
              }

              console.log(
                `✅ Activity ${object_id} successfully synced to database`,
              );

              // Mark webhook as processed
              await supabase
                .from("webhook_events")
                .update({ processed: true })
                .eq("object_id", object_id)
                .eq("aspect_type", "create");
            } catch (error) {
              console.error(
                `❌ Failed to process activity creation for ID ${object_id}:`,
                error,
              );
            }
            break;

          case "update":
            try {
              console.log(`✏️ Processing activity update for ID: ${object_id}`);

              // First, check if the activity exists in our database
              const { data: existingActivity, error: fetchError } =
                await supabase
                  .from("activities")
                  .select("id")
                  .eq("id", object_id)
                  .single();

              if (fetchError || !existingActivity) {
                console.log(
                  `⚠️ Activity ${object_id} not found in database, skipping update`,
                );
                // Mark webhook as processed even if activity doesn't exist
                await supabase
                  .from("webhook_events")
                  .update({ processed: true })
                  .eq("object_id", object_id)
                  .eq("aspect_type", "update");
                return new Response("Not Found", { status: 404 });
              }

              // Update the activity in our database based on the changes
              const updateData: Record<string, unknown> = {
                updated_at: new Date().toISOString(),
              };
              let hasChanges = false;

              if (updates) {
                if (updates.title) {
                  updateData.name = updates.title;
                  console.log(`  📝 Updating title to: "${updates.title}"`);
                  hasChanges = true;
                }
                if (updates.type) {
                  updateData.sport_type = updates.type;
                  console.log(
                    `  🏃 Updating activity type to: "${updates.type}"`,
                  );
                  hasChanges = true;
                }
                if (updates.private !== undefined) {
                  updateData.private = updates.private;
                  console.log(
                    `  🔒 Updating privacy to: ${
                      updates.private ? "private" : "public"
                    }`,
                  );
                  hasChanges = true;
                }
              }

              // Only perform update if there are actual changes
              if (hasChanges) {
                const { error: updateError } = await supabase
                  .from("activities")
                  .update(updateData)
                  .eq("id", object_id);

                if (updateError) {
                  console.error("Failed to update activity:", updateError);
                  return new Response("Internal error", { status: 500 });
                }

                console.log(`✅ Activity ${object_id} updated successfully`);
              } else {
                console.log(`ℹ️ No changes to apply for activity ${object_id}`);
              }

              // Mark webhook as processed
              await supabase
                .from("webhook_events")
                .update({ processed: true })
                .eq("object_id", object_id)
                .eq("aspect_type", "update");
            } catch (error) {
              console.error(
                `❌ Failed to process activity update for ID ${object_id}:`,
                error,
              );
            }
            break;

          case "delete":
            try {
              console.log(
                `🗑️ Processing activity deletion for ID: ${object_id}`,
              );

              // Delete the activity from our database
              const { error: deleteError } = await supabase
                .from("activities")
                .delete()
                .eq("id", object_id);

              if (deleteError) {
                console.error("Failed to delete activity:", deleteError);
              }

              // Mark webhook as processed
              await supabase
                .from("webhook_events")
                .update({ processed: true })
                .eq("object_id", object_id)
                .eq("aspect_type", "delete");

              console.log(
                `✅ Activity deletion webhook processed for ID: ${object_id}`,
              );
            } catch (error) {
              console.error(
                `❌ Failed to process activity deletion for ID ${object_id}:`,
                error,
              );
            }
            break;

          default:
            console.log(
              `❓ Unknown activity aspect_type: ${aspect_type} for ID: ${object_id}`,
            );
            // Still mark as processed since we've logged it
            await supabase
              .from("webhook_events")
              .update({ processed: true })
              .eq("object_id", object_id)
              .eq("aspect_type", aspect_type);
        }
      } else {
        // For non-activity events (athlete deauthorization, etc.)
        console.log(
          `📊 Processing ${object_type?.toUpperCase()} event (${aspect_type})`,
        );

        if (object_type === "athlete" && aspect_type === "update") {
          // Handle athlete deauthorization
          if (updates?.authorized === "false") {
            console.log(`🚫 Athlete ${owner_id} deauthorized the app`);

            // You could:
            // 1. Mark user as deauthorized in your users table
            // 2. Delete or archive their activities
            // 3. Send notification emails
            // For now, we'll just log it
          }
        }

        // Mark webhook as processed
        await supabase
          .from("webhook_events")
          .update({ processed: true })
          .eq("object_id", object_id)
          .eq("aspect_type", aspect_type);
      }

      return new Response("EVENT_RECEIVED", {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    } catch (error) {
      console.error("Error processing webhook:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  return new Response("Method Not Allowed", { status: 405 });
});

/* Webhook Registration Instructions:

  To register this webhook with Strava:

  1. Start your Supabase instance: `supabase start`

  2. Get your public webhook URL (for production) or use ngrok for local testing:
     - Production: https://your-project.supabase.co/functions/v1/strava-webhook
     - Local with ngrok: https://your-ngrok-url.ngrok.io/functions/v1/strava-webhook

  3. Register the webhook with Strava API:

     curl -X POST https://www.strava.com/api/v3/push_subscriptions \
       -H "Content-Type: application/json" \
       -d '{
         "client_id": "YOUR_CLIENT_ID",
         "client_secret": "YOUR_CLIENT_SECRET",
         "callback_url": "YOUR_WEBHOOK_URL",
         "verify_token": "STRAVA"
       }'

  4. Test locally:

     curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/strava-webhook' \
       --header 'Content-Type: application/json' \
       --data '{
         "object_type": "activity",
         "object_id": 1234567890,
         "aspect_type": "create",
         "owner_id": 134815,
         "subscription_id": 120475,
         "event_time": 1516126040
       }'

*/
