/// <reference lib="deno.ns" />
import { assertEquals } from 'jsr:@std/assert@1'

// Handler function extracted from the webhook with updated logic
async function webhookHandler(req: Request): Promise<Response> {
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
      verifyToken: hubVerifyToken
    });
    
    // Verify the challenge for webhook subscription
    if (hubMode === "subscribe" && hubChallenge) {
      return new Response(JSON.stringify({ "hub.challenge": hubChallenge }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    return new Response("Bad Request", { status: 400 });
  }
  
  // Handle webhook events (POST request)
  if (method === "POST") {
    try {
      const payload = await req.json();
      
      console.log("Strava webhook payload received:", JSON.stringify(payload, null, 2));

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

      // Handle activity-specific events
      if (object_type === "activity") {
        switch (aspect_type) {
          case "create":
            console.log("🚀 Activity Created:", {
              activityId: object_id,
              ownerId: owner_id,
              eventTime: new Date(event_time * 1000).toISOString(),
              subscriptionId: subscription_id,
              message: "New activity uploaded to Strava",
            });
            break;

          case "update":
            console.log("✏️ Activity Updated:", {
              activityId: object_id,
              ownerId: owner_id,
              eventTime: new Date(event_time * 1000).toISOString(),
              subscriptionId: subscription_id,
              changedFields: updates || {},
              message: "Activity details modified",
            });
            
            // Log specific field changes
            if (updates) {
              if (updates.title) {
                console.log(`  📝 Title changed to: "${updates.title}"`);
              }
              if (updates.type) {
                console.log(`  🏃 Activity type changed to: "${updates.type}"`);
              }
              if (updates.private !== undefined) {
                console.log(`  🔒 Privacy changed to: ${updates.private ? "private" : "public"}`);
              }
            }
            break;

          case "delete":
            console.log("🗑️ Activity Deleted:", {
              activityId: object_id,
              ownerId: owner_id,
              eventTime: new Date(event_time * 1000).toISOString(),
              subscriptionId: subscription_id,
              message: "Activity deleted or made private",
            });
            break;

          default:
            console.log("❓ Unknown Activity Event:", {
              activityId: object_id,
              aspectType: aspect_type,
              ownerId: owner_id,
              eventTime: new Date(event_time * 1000).toISOString(),
              subscriptionId: subscription_id,
              fullPayload: payload,
            });
        }
      } else {
        // For non-activity events (athlete, etc.), log the entire payload
        console.log(`📊 ${object_type?.toUpperCase()} Event (${aspect_type}):`, {
          fullPayload: payload,
          eventTime: new Date(event_time * 1000).toISOString(),
          message: `Complete payload for ${object_type} ${aspect_type} event`,
        });
      }
      
      return new Response("EVENT_RECEIVED", { 
        status: 200,
        headers: { "Content-Type": "text/plain" }
      });
      
    } catch (error) {
      console.error("Error processing webhook:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }
  
  return new Response("Method Not Allowed", { status: 405 });
}

Deno.test("Strava Webhook - GET request webhook verification with valid challenge", async () => {
  const url = "http://localhost:54321/functions/v1/strava-webhook?hub.mode=subscribe&hub.challenge=test_challenge_123&hub.verify_token=STRAVA"
  const request = new Request(url, { method: 'GET' })
  
  const response = await webhookHandler(request)
  const responseBody = await response.json()
  
  assertEquals(response.status, 200)
  assertEquals(response.headers.get('Content-Type'), 'application/json')
  assertEquals(responseBody['hub.challenge'], 'test_challenge_123')
})

Deno.test("Strava Webhook - GET request webhook verification without challenge", async () => {
  const url = "http://localhost:54321/functions/v1/strava-webhook?hub.mode=subscribe&hub.verify_token=STRAVA"
  const request = new Request(url, { method: 'GET' })
  
  const response = await webhookHandler(request)
  
  assertEquals(response.status, 400)
  assertEquals(await response.text(), "Bad Request")
})

Deno.test("Strava Webhook - POST activity creation event", async () => {
  const payload = {
    object_type: "activity",
    object_id: 1234567890,
    aspect_type: "create",
    owner_id: 134815,
    subscription_id: 120475,
    event_time: 1516126040,
    updates: {}
  }
  
  const request = new Request("http://localhost:54321/functions/v1/strava-webhook", {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  
  const response = await webhookHandler(request)
  
  assertEquals(response.status, 200)
  assertEquals(await response.text(), "EVENT_RECEIVED")
})

Deno.test("Strava Webhook - POST activity update event with title change", async () => {
  const payload = {
    object_type: "activity",
    object_id: 9876543210,
    aspect_type: "update",
    owner_id: 987654,
    subscription_id: 120475,
    event_time: 1516126100,
    updates: {
      title: "Updated Morning Run"
    }
  }
  
  const request = new Request("http://localhost:54321/functions/v1/strava-webhook", {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  
  const response = await webhookHandler(request)
  
  assertEquals(response.status, 200)
  assertEquals(await response.text(), "EVENT_RECEIVED")
})

Deno.test("Strava Webhook - POST activity update event with type and privacy changes", async () => {
  const payload = {
    object_type: "activity",
    object_id: 5555555555,
    aspect_type: "update",
    owner_id: 123456,
    subscription_id: 120475,
    event_time: 1516126200,
    updates: {
      type: "Ride",
      private: true
    }
  }
  
  const request = new Request("http://localhost:54321/functions/v1/strava-webhook", {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  
  const response = await webhookHandler(request)
  
  assertEquals(response.status, 200)
  assertEquals(await response.text(), "EVENT_RECEIVED")
})

Deno.test("Strava Webhook - POST activity deletion event", async () => {
  const payload = {
    object_type: "activity",
    object_id: 7777777777,
    aspect_type: "delete",
    owner_id: 234567,
    subscription_id: 120475,
    event_time: 1516126300,
    updates: {}
  }
  
  const request = new Request("http://localhost:54321/functions/v1/strava-webhook", {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  
  const response = await webhookHandler(request)
  
  assertEquals(response.status, 200)
  assertEquals(await response.text(), "EVENT_RECEIVED")
})

Deno.test("Strava Webhook - POST unknown activity aspect_type", async () => {
  const payload = {
    object_type: "activity",
    object_id: 8888888888,
    aspect_type: "unknown",
    owner_id: 345678,
    subscription_id: 120475,
    event_time: 1516126400,
    updates: {}
  }
  
  const request = new Request("http://localhost:54321/functions/v1/strava-webhook", {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  
  const response = await webhookHandler(request)
  
  assertEquals(response.status, 200)
  assertEquals(await response.text(), "EVENT_RECEIVED")
})

Deno.test("Strava Webhook - POST athlete deauthorization event", async () => {
  const payload = {
    object_type: "athlete",
    object_id: 134815,
    aspect_type: "update",
    owner_id: 134815,
    subscription_id: 120475,
    event_time: 1516126500,
    updates: {
      authorized: "false"
    }
  }
  
  const request = new Request("http://localhost:54321/functions/v1/strava-webhook", {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  
  const response = await webhookHandler(request)
  
  assertEquals(response.status, 200)
  assertEquals(await response.text(), "EVENT_RECEIVED")
})

Deno.test("Strava Webhook - POST unknown object_type event", async () => {
  const payload = {
    object_type: "unknown",
    object_id: 999999999,
    aspect_type: "create",
    owner_id: 456789,
    subscription_id: 120475,
    event_time: 1516126600,
    updates: {}
  }
  
  const request = new Request("http://localhost:54321/functions/v1/strava-webhook", {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  
  const response = await webhookHandler(request)
  
  assertEquals(response.status, 200)
  assertEquals(await response.text(), "EVENT_RECEIVED")
})

Deno.test("Strava Webhook - POST invalid JSON payload", async () => {
  const request = new Request("http://localhost:54321/functions/v1/strava-webhook", {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: "invalid json{"
  })
  
  const response = await webhookHandler(request)
  
  assertEquals(response.status, 500)
  assertEquals(await response.text(), "Internal Server Error")
})

Deno.test("Strava Webhook - PUT request returns Method Not Allowed", async () => {
  const request = new Request("http://localhost:54321/functions/v1/strava-webhook", {
    method: 'PUT'
  })
  
  const response = await webhookHandler(request)
  
  assertEquals(response.status, 405)
  assertEquals(await response.text(), "Method Not Allowed")
})