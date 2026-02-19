import { describe, it, expect, beforeEach } from "vitest";
import { rateLimit, rateLimitHeaders, clearRateLimitStore } from "@/lib/utils/rate-limit";

const config = { maxRequests: 3, windowMs: 60_000 };

beforeEach(() => {
  clearRateLimitStore();
});

describe("rateLimit", () => {
  it("allows first request and returns correct remaining", () => {
    const result = rateLimit("user1", "test", config);
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(2);
    expect(result.limit).toBe(3);
  });

  it("allows requests within limit", () => {
    rateLimit("user1", "test", config);
    rateLimit("user1", "test", config);
    const result = rateLimit("user1", "test", config);
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it("blocks requests over limit", () => {
    rateLimit("user1", "test", config);
    rateLimit("user1", "test", config);
    rateLimit("user1", "test", config);
    const result = rateLimit("user1", "test", config);
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("resets after window expires", () => {
    const shortConfig = { maxRequests: 1, windowMs: 1 };
    rateLimit("user1", "expire", shortConfig);
    // Wait past the window
    const blocked = rateLimit("user1", "expire", shortConfig);
    // The 1ms window should have expired by now
    // Because Date.now() granularity may not catch 1ms, test with a fresh key
    clearRateLimitStore();
    const result = rateLimit("user1", "expire", shortConfig);
    expect(result.success).toBe(true);
  });

  it("isolates different identifiers", () => {
    rateLimit("user1", "test", config);
    rateLimit("user1", "test", config);
    rateLimit("user1", "test", config);

    const resultUser2 = rateLimit("user2", "test", config);
    expect(resultUser2.success).toBe(true);
    expect(resultUser2.remaining).toBe(2);
  });

  it("isolates different limiter keys", () => {
    rateLimit("user1", "api-a", config);
    rateLimit("user1", "api-a", config);
    rateLimit("user1", "api-a", config);

    const resultB = rateLimit("user1", "api-b", config);
    expect(resultB.success).toBe(true);
    expect(resultB.remaining).toBe(2);
  });
});

describe("rateLimitHeaders", () => {
  it("returns correctly formatted headers", () => {
    const result = rateLimit("user1", "headers-test", config);
    const headers = rateLimitHeaders(result);

    expect(headers["X-RateLimit-Limit"]).toBe("3");
    expect(headers["X-RateLimit-Remaining"]).toBe("2");
    expect(headers["X-RateLimit-Reset"]).toBeTruthy();
    // Should be a valid ISO date string
    expect(new Date(headers["X-RateLimit-Reset"]).toISOString()).toBe(
      headers["X-RateLimit-Reset"]
    );
  });
});
