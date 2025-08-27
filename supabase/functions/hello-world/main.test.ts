import { assertEquals } from "@std/assert";
import handler from "./handler.ts";

Deno.test.ignore(async function serverFetch() {
  Deno.env.set("SUPABASE_DB_URL", "ok");
  const req = new Request("https://deno.land");
  const res = await handler(req);
  const body = await res.text();
  assertEquals(body, "hello ok");
});
