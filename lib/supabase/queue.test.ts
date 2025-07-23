import { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseQueue } from "./queue";
import { vi } from "vitest";

describe(SupabaseQueue.name, () => {
  describe("Instantiation", () => {
    it("requires the name of a queue to be instantiated", () => {
      expect(() => {
        //@ts-expect-error Ignoring type system to test against implementation
        new SupabaseQueue({ queue: undefined });
      }).toThrow();
      expect(() => {
        //@ts-expect-error Ignoring type system to test against implementation
        new SupabaseQueue({ queue: undefined });
      }).toThrow();
    });

    it("can be instantiated with the 2 SUPABASE envVars properly setup", () => {
      process.env.SUPABASE_URL = "https:/...";
      process.env.SUPABASE_ANON_KEY = "abcdefgh";
      expect(() => {
        new SupabaseQueue({ queue: "queue" });
      }).not.toThrow();

      delete process.env.SUPABASE_URL;
      expect(() => {
        new SupabaseQueue({ queue: "queue" });
      }).toThrow();

      delete process.env.SUPABASE_ANON_KEY;
      process.env.SUPABASE_URL = "https:/...";
      expect(() => {
        new SupabaseQueue({ queue: "queue" });
      }).toThrow();
      delete process.env.SUPABASE_URL;

      expect(process.env.SUPABASE_URL).toBeUndefined();
      expect(process.env.SUPABASE_ANON_KEY).toBeUndefined();
    });

    it("can be instantiated with both keys passed as a parameter", () => {
      expect(() => {
        new SupabaseQueue({
          queue: "queue",
          supabaseUrl: "https://...",
          supabaseKey: "abcdefgh",
        });
      }).not.toThrow();
    });

    it("can be instantiated with a custom client", () => {
      expect(() => {
        new SupabaseQueue({
          queue: "queue",
          client: new SupabaseClient("https://...", "abcdefgh"),
        });
      }).not.toThrow();
    });
  });

  it("sends a message to the queue via the SupabaseClient", () => {
    const sbClient = new SupabaseClient("https://...", "abcdefgh");
    const methodMock = vi.spyOn(sbClient, "rpc");

    const client = new SupabaseQueue({ queue: "hello", client: sbClient });
    client.push({});
    expect(methodMock).toHaveBeenCalledWith("send", {
      queue_name: "hello",
      message: {},
    });

    client.push({ name: "world" });
    expect(methodMock).toHaveBeenCalledWith("send", {
      queue_name: "hello",
      message: { name: "world" },
    });
  });

  it("Receives a message to the queue via the SupabaseClient", () => {
    const sbClient = new SupabaseClient("https://...", "abcdefgh");
    const methodMock = vi.spyOn(sbClient, "rpc");

    const client = new SupabaseQueue({ queue: "hello", client: sbClient });
    client.pull();

    expect(methodMock).toHaveBeenCalledWith("pop", {
      queue_name: "hello",
    });
  });
});
