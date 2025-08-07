/// <reference lib="deno.ns" />
import { assertEquals } from "jsr:@std/assert@1";
import webhookHandler from "./handler.ts";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Mock Supabase client for testing
function createMockSupabaseClient(supabaseFail = false): SupabaseClient {
  const supabasePayload = supabaseFail
    ? { error: new Error("error in tests") }
    : { error: null };

  const returnPromise = (payload: unknown) =>
    supabaseFail ? Promise.reject(payload) : Promise.resolve(payload);

  return {
    from: (_table: string) => ({
      insert: (_data: unknown) => returnPromise(supabasePayload),
      update: (_data: unknown) => ({
        eq: (_column: string, _value: unknown) => ({
          eq: () => returnPromise(supabasePayload),
        }),
      }),
      delete: () => ({
        eq: (_column: string, _value: unknown) =>
          returnPromise(supabasePayload),
      }),
      select: (_columns: string) => ({
        eq: (_column: string, _value: unknown) => ({
          single: () =>
            returnPromise({
              ...supabasePayload,
              data: {
                raw_user_meta_data: {
                  access_token: "mock_token",
                },
              },
            }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;
}
Deno.test(
  "Strava Webhook - GET request webhook verification with valid challenge",
  async () => {
    const url =
      "http://localhost:54321/functions/v1/strava-webhook?hub.mode=subscribe&hub.challenge=test_challenge_123&hub.verify_token=STRAVA";
    const request = new Request(url, { method: "GET" });

    const response = await webhookHandler(request, createMockSupabaseClient());
    const responseBody = await response.json();

    assertEquals(response.status, 200);
    assertEquals(response.headers.get("Content-Type"), "application/json");
    assertEquals(responseBody["hub.challenge"], "test_challenge_123");
  },
);

Deno.test(
  "Strava Webhook - GET request webhook verification without challenge",
  async () => {
    const url =
      "http://localhost:54321/functions/v1/strava-webhook?hub.mode=subscribe&hub.verify_token=STRAVA";
    const request = new Request(url, { method: "GET" });

    const response = await webhookHandler(request, createMockSupabaseClient());

    assertEquals(response.status, 400);
    assertEquals(await response.text(), "Bad Request");
  },
);

Deno.test("Strava Webhook - GET request with invalid mode", async () => {
  const url =
    "http://localhost:54321/functions/v1/strava-webhook?hub.mode=invalid&hub.challenge=test_challenge&hub.verify_token=STRAVA";
  const request = new Request(url, { method: "GET" });

  const response = await webhookHandler(request, createMockSupabaseClient());

  assertEquals(response.status, 400);
  assertEquals(await response.text(), "Bad Request");
});

Deno.test(
  "Strava Webhook - POST request with valid activity creation payload",
  async () => {
    const payload = {
      object_type: "activity",
      object_id: 1234567890,
      aspect_type: "create",
      owner_id: 134815,
      subscription_id: 120475,
      event_time: 1516126040,
    };

    const request = new Request(
      "http://localhost:54321/functions/v1/strava-webhook",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    const response = await webhookHandler(request, createMockSupabaseClient());
    const responseText = await response.text();

    assertEquals(response.status, 200);
    assertEquals(response.headers.get("Content-Type"), "text/plain");
    assertEquals(responseText, "EVENT_RECEIVED");
  },
);

Deno.test(
  "Strava Webhook - POST request with activity update payload",
  async () => {
    const payload = {
      object_type: "activity",
      object_id: 9876543210,
      aspect_type: "update",
      owner_id: 987654,
      subscription_id: 120475,
      event_time: 1516126100,
      updates: {
        title: "Updated title",
        type: "Ride",
      },
    };

    const request = new Request(
      "http://localhost:54321/functions/v1/strava-webhook",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    const response = await webhookHandler(request, createMockSupabaseClient());

    assertEquals(response.status, 200);
    assertEquals(await response.text(), "EVENT_RECEIVED");
  },
);

Deno.test(
  "Strava Webhook - POST request with activity deletion payload",
  async () => {
    const payload = {
      object_type: "activity",
      object_id: 5555555555,
      aspect_type: "delete",
      owner_id: 123456,
      subscription_id: 120475,
      event_time: 1516126200,
    };

    const request = new Request(
      "http://localhost:54321/functions/v1/strava-webhook",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    const response = await webhookHandler(request, createMockSupabaseClient());

    assertEquals(response.status, 200);
    assertEquals(await response.text(), "EVENT_RECEIVED");
  },
);

Deno.test(
  "Strava Webhook - POST request with athlete update payload",
  async () => {
    const payload = {
      object_type: "athlete",
      object_id: 134815,
      aspect_type: "update",
      owner_id: 134815,
      subscription_id: 120475,
      event_time: 1516126300,
      updates: {
        authorized: "false",
      },
    };

    const request = new Request(
      "http://localhost:54321/functions/v1/strava-webhook",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    const response = await webhookHandler(request, createMockSupabaseClient());

    assertEquals(response.status, 200);
    assertEquals(await response.text(), "EVENT_RECEIVED");
  },
);

Deno.test(
  "Strava Webhook - POST request with invalid JSON payload",
  async () => {
    const request = new Request(
      "http://localhost:54321/functions/v1/strava-webhook",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid json{",
      },
    );

    const response = await webhookHandler(request, createMockSupabaseClient());

    assertEquals(response.status, 500);
    assertEquals(await response.text(), "Internal Server Error");
  },
);

Deno.test("Strava Webhook - POST request with empty body", async () => {
  const request = new Request(
    "http://localhost:54321/functions/v1/strava-webhook",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "",
    },
  );

  const response = await webhookHandler(request, createMockSupabaseClient());

  assertEquals(response.status, 500);
  assertEquals(await response.text(), "Internal Server Error");
});

Deno.test(
  "Strava Webhook - PUT request returns Method Not Allowed",
  async () => {
    const request = new Request(
      "http://localhost:54321/functions/v1/strava-webhook",
      {
        method: "PUT",
        body: JSON.stringify({ test: "data" }),
      },
    );

    const response = await webhookHandler(request, createMockSupabaseClient());

    assertEquals(response.status, 405);
    assertEquals(await response.text(), "Method Not Allowed");
  },
);

Deno.test(
  "Strava Webhook - DELETE request returns Method Not Allowed",
  async () => {
    const request = new Request(
      "http://localhost:54321/functions/v1/strava-webhook",
      {
        method: "DELETE",
      },
    );

    const response = await webhookHandler(request, createMockSupabaseClient());

    assertEquals(response.status, 405);
    assertEquals(await response.text(), "Method Not Allowed");
  },
);

Deno.test(
  "Strava Webhook - PATCH request returns Method Not Allowed",
  async () => {
    const request = new Request(
      "http://localhost:54321/functions/v1/strava-webhook",
      {
        method: "PATCH",
      },
    );

    const response = await webhookHandler(request, createMockSupabaseClient());

    assertEquals(response.status, 405);
    assertEquals(await response.text(), "Method Not Allowed");
  },
);
