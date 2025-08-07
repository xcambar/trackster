/// <reference lib="deno.ns" />
// Supabase Edge Function for Strava Webhook handling
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment

import webhookHandler from "./handler";

console.log("Strava Webhook Function started");

Deno.serve((req, ...args) => webhookHandler(req));

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
