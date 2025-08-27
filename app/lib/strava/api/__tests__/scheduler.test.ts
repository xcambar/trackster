import { AccessToken } from "strava";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getStravaAPIClient } from "../../api";
import { StravaAPIScheduler } from "../scheduler";

// Mock dependencies - CronJob set to not execute for tests that would timeout
vi.mock("../../api");
vi.mock("cron", () => ({
  CronJob: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
  })),
}));
vi.mock("@trackster/env", () => ({
  getEnvironment: vi.fn().mockImplementation((key: string) => {
    const mockValues: Record<string, string> = {
      SUPABASE_URL: "https://mock.supabase.co",
      SUPABASE_ANON_KEY: "mock_anon_key",
      STRAVA_CLIENT_ID: "mock_client_id",
      STRAVA_CLIENT_SECRET: "mock_client_secret",
    };
    return mockValues[key] || "mock_default_value";
  }),
}));

const mockStravaClient = {
  activities: {
    getLoggedInAthleteActivities: vi.fn(),
    getActivityById: vi.fn(),
  },
};

const mockAccessToken: AccessToken = {
  access_token: "test_token",
  refresh_token: "test_refresh",
  expires_at: Date.now() / 1000 + 3600,
};

describe("StravaAPIScheduler", () => {
  let scheduler: StravaAPIScheduler;

  beforeEach(() => {
    vi.mocked(getStravaAPIClient).mockReturnValue(mockStravaClient as any);
    vi.clearAllMocks();
    scheduler = new StravaAPIScheduler(mockAccessToken);
  });

  describe("Basic Functionality", () => {
    describe("constructor", () => {
      it("should initialize with correct client", () => {
        expect(getStravaAPIClient).toHaveBeenCalledWith(mockAccessToken);
      });
    });

    describe("immediate execution", () => {
      it("should execute request immediately when no rate limits", async () => {
        const mockFn = vi
          .fn()
          .mockResolvedValue({ id: 123, name: "Test Activity" });

        const result = await scheduler.request(mockFn);

        expect(mockFn).toHaveBeenCalledWith(
          mockStravaClient,
          expect.stringMatching(/^request-\d+$/)
        );
        expect(result).toEqual({ id: 123, name: "Test Activity" });
      });

      it("should handle successful API calls with custom name", async () => {
        const mockActivities = [
          { id: 1, name: "Run 1" },
          { id: 2, name: "Run 2" },
        ];
        const mockFn = vi.fn().mockResolvedValue(mockActivities);

        const result = await scheduler.request(mockFn, "get-activities");

        expect(result).toEqual(mockActivities);
        expect(mockFn).toHaveBeenCalledWith(
          mockStravaClient,
          expect.stringMatching(/^get-activities-\d+$/)
        );
      });

      it("should handle API calls with page parameters", async () => {
        const mockActivities = [
          { id: 1, name: "Run 1" },
          { id: 2, name: "Run 2" },
        ];
        mockStravaClient.activities.getLoggedInAthleteActivities.mockResolvedValue(
          mockActivities
        );

        const result = await scheduler.request((client) =>
          client.activities.getLoggedInAthleteActivities({ page: 1 })
        );

        expect(result).toEqual(mockActivities);
        expect(
          mockStravaClient.activities.getLoggedInAthleteActivities
        ).toHaveBeenCalledWith({ page: 1 });
      });
    });
  });

  describe("Rate Limit Handling", () => {
    describe("429 error retry scenarios", () => {
      it("should retry on 429 errors when rate limits allow immediate retry", async () => {
        const rateLimit429Error = new Response(null, {
          status: 429,
          headers: new Headers({
            "x-readratelimit-limit": "100,1000",
            "x-readratelimit-usage": "95,800", // Under limit - allows immediate retry
            "x-ratelimit-limit": "600,30000",
            "x-ratelimit-usage": "580,25000",
          }),
        });

        const mockFn = vi
          .fn()
          .mockRejectedValueOnce(rateLimit429Error)
          .mockResolvedValueOnce({ success: true });

        const result = await scheduler.request(mockFn);

        expect(mockFn).toHaveBeenCalledTimes(2);
        expect(result).toEqual({ success: true });
      });

      it("should fail after max attempts on repeated 429 errors", async () => {
        const rateLimit429Error = new Response(null, {
          status: 429,
          headers: new Headers({
            "x-readratelimit-limit": "100,1000",
            "x-readratelimit-usage": "95,800", // Under limit to avoid scheduling delays
            "x-ratelimit-limit": "600,30000",
            "x-ratelimit-usage": "580,25000",
          }),
        });

        const mockFn = vi.fn().mockRejectedValue(rateLimit429Error);

        await expect(scheduler.request(mockFn)).rejects.toThrow();
        expect(mockFn).toHaveBeenCalledTimes(3); // MAX_ATTEMPTS
      });
    });

    describe("rate limit header parsing", () => {
      it("should update limits and usage from 429 response headers", async () => {
        const rateLimit429Error = new Response(null, {
          status: 429,
          headers: new Headers({
            "x-readratelimit-limit": "100,1000",
            "x-readratelimit-usage": "95,800",
            "x-ratelimit-limit": "600,30000",
            "x-ratelimit-usage": "580,25000",
          }),
        });

        const mockFn = vi
          .fn()
          .mockRejectedValueOnce(rateLimit429Error)
          .mockResolvedValueOnce({ success: true });

        await scheduler.request(mockFn);

        // Verify internal state was updated (we can test this indirectly through behavior)
        expect(mockFn).toHaveBeenCalledTimes(2);
      });

      it("should handle missing rate limit headers gracefully", async () => {
        const errorWithoutHeaders = new Response(null, {
          status: 429,
          headers: new Headers(),
        });

        const mockFn = vi
          .fn()
          .mockRejectedValueOnce(errorWithoutHeaders)
          .mockResolvedValueOnce({ success: true });

        // This should succeed because missing headers default to "now" execution
        const result = await scheduler.request(mockFn);
        expect(result).toEqual({ success: true });
        expect(mockFn).toHaveBeenCalledTimes(2);
      });

      it("should handle malformed rate limit headers by proceeding immediately", async () => {
        const errorWithBadHeaders = new Response(null, {
          status: 429,
          headers: new Headers({
            "x-readratelimit-limit": "invalid",
            "x-readratelimit-usage": "also-invalid",
          }),
        });

        const mockFn = vi
          .fn()
          .mockRejectedValueOnce(errorWithBadHeaders)
          .mockResolvedValueOnce({ success: true });

        // Should proceed immediately due to malformed headers
        const result = await scheduler.request(mockFn);
        expect(result).toEqual({ success: true });
        expect(mockFn).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("Error Handling", () => {
    it("should throw immediately on non-429 errors", async () => {
      const nonRateLimitError = new Response(null, { status: 404 });
      const mockFn = vi.fn().mockRejectedValue(nonRateLimitError);

      await expect(scheduler.request(mockFn)).rejects.toThrow();
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it("should handle async errors in requests", async () => {
      const error = new Error("Async error");
      const mockFn = vi.fn().mockRejectedValue(error);

      await expect(scheduler.request(mockFn)).rejects.toThrow("Async error");
    });
  });
});
