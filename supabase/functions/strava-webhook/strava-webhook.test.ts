/// <reference lib="deno.ns" />
import { assertEquals } from 'jsr:@std/assert@1'

// Handler function extracted from the webhook
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
      
      // Log the event details
      const { object_type, object_id, aspect_type, owner_id, subscription_id, event_time } = payload;
      
      console.log("Event details:", {
        objectType: object_type,
        objectId: object_id,
        aspectType: aspect_type,
        ownerId: owner_id,
        subscriptionId: subscription_id,
        eventTime: event_time,
        timestamp: new Date().toISOString()
      });
      
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

Deno.test("Strava Webhook - GET request with invalid mode", async () => {
  const url = "http://localhost:54321/functions/v1/strava-webhook?hub.mode=invalid&hub.challenge=test_challenge&hub.verify_token=STRAVA"
  const request = new Request(url, { method: 'GET' })
  
  const response = await webhookHandler(request)
  
  assertEquals(response.status, 400)
  assertEquals(await response.text(), "Bad Request")
})

Deno.test("Strava Webhook - POST request with valid activity creation payload", async () => {
  const payload = {
    object_type: "activity",
    object_id: 1234567890,
    aspect_type: "create",
    owner_id: 134815,
    subscription_id: 120475,
    event_time: 1516126040
  }
  
  const request = new Request("http://localhost:54321/functions/v1/strava-webhook", {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  
  const response = await webhookHandler(request)
  const responseText = await response.text()
  
  assertEquals(response.status, 200)
  assertEquals(response.headers.get('Content-Type'), 'text/plain')
  assertEquals(responseText, "EVENT_RECEIVED")
})

Deno.test("Strava Webhook - POST request with activity update payload", async () => {
  const payload = {
    object_type: "activity",
    object_id: 9876543210,
    aspect_type: "update",
    owner_id: 987654,
    subscription_id: 120475,
    event_time: 1516126100,
    updates: {
      title: "Updated title",
      type: "Ride"
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

Deno.test("Strava Webhook - POST request with activity deletion payload", async () => {
  const payload = {
    object_type: "activity",
    object_id: 5555555555,
    aspect_type: "delete",
    owner_id: 123456,
    subscription_id: 120475,
    event_time: 1516126200
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

Deno.test("Strava Webhook - POST request with athlete update payload", async () => {
  const payload = {
    object_type: "athlete",
    object_id: 134815,
    aspect_type: "update",
    owner_id: 134815,
    subscription_id: 120475,
    event_time: 1516126300,
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

Deno.test("Strava Webhook - POST request with invalid JSON payload", async () => {
  const request = new Request("http://localhost:54321/functions/v1/strava-webhook", {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: "invalid json{"
  })
  
  const response = await webhookHandler(request)
  
  assertEquals(response.status, 500)
  assertEquals(await response.text(), "Internal Server Error")
})

Deno.test("Strava Webhook - POST request with empty body", async () => {
  const request = new Request("http://localhost:54321/functions/v1/strava-webhook", {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: ""
  })
  
  const response = await webhookHandler(request)
  
  assertEquals(response.status, 500)
  assertEquals(await response.text(), "Internal Server Error")
})

Deno.test("Strava Webhook - PUT request returns Method Not Allowed", async () => {
  const request = new Request("http://localhost:54321/functions/v1/strava-webhook", {
    method: 'PUT',
    body: JSON.stringify({ test: "data" })
  })
  
  const response = await webhookHandler(request)
  
  assertEquals(response.status, 405)
  assertEquals(await response.text(), "Method Not Allowed")
})

Deno.test("Strava Webhook - DELETE request returns Method Not Allowed", async () => {
  const request = new Request("http://localhost:54321/functions/v1/strava-webhook", {
    method: 'DELETE'
  })
  
  const response = await webhookHandler(request)
  
  assertEquals(response.status, 405)
  assertEquals(await response.text(), "Method Not Allowed")
})

Deno.test("Strava Webhook - PATCH request returns Method Not Allowed", async () => {
  const request = new Request("http://localhost:54321/functions/v1/strava-webhook", {
    method: 'PATCH'
  })
  
  const response = await webhookHandler(request)
  
  assertEquals(response.status, 405)
  assertEquals(await response.text(), "Method Not Allowed")
})