/// <reference lib="deno.ns" />
// Supabase Edge Function for Strava Webhook handling
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment

console.log("Strava Webhook Function started");

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

      // Log the event details
      const {
        object_type,
        object_id,
        aspect_type,
        owner_id,
        subscription_id,
        event_time,
      } = payload;

      console.log("Event details:", {
        objectType: object_type,
        objectId: object_id,
        aspectType: aspect_type,
        ownerId: owner_id,
        subscriptionId: subscription_id,
        eventTime: event_time,
        timestamp: new Date().toISOString(),
      });

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
