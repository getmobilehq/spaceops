import { describe, it, expect } from "vitest";
import { getDateRange } from "@/lib/utils/analytics-queries";

describe("getDateRange", () => {
  it("returns 7 days ago for '7d' period", () => {
    const { from, to } = getDateRange("7d");
    const now = new Date();
    const diffDays = Math.round(
      (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)
    );
    expect(diffDays).toBeGreaterThanOrEqual(7);
    expect(diffDays).toBeLessThanOrEqual(8);
    expect(to.getTime()).toBeGreaterThanOrEqual(now.getTime() - 1000);
  });

  it("returns 30 days ago for '30d' period", () => {
    const { from, to } = getDateRange("30d");
    const diffDays = Math.round(
      (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)
    );
    expect(diffDays).toBeGreaterThanOrEqual(30);
    expect(diffDays).toBeLessThanOrEqual(31);
  });

  it("returns 90 days ago for '90d' period", () => {
    const { from, to } = getDateRange("90d");
    const diffDays = Math.round(
      (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)
    );
    expect(diffDays).toBeGreaterThanOrEqual(90);
    expect(diffDays).toBeLessThanOrEqual(91);
  });

  it("defaults to 30d for unknown period", () => {
    const { from, to } = getDateRange("unknown");
    const diffDays = Math.round(
      (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)
    );
    expect(diffDays).toBeGreaterThanOrEqual(30);
    expect(diffDays).toBeLessThanOrEqual(31);
  });

  it("uses custom dates when period is 'custom'", () => {
    const { from, to } = getDateRange("custom", "2025-01-01", "2025-06-30");
    expect(from.getFullYear()).toBe(2025);
    expect(from.getMonth()).toBe(0); // January
    expect(to.getFullYear()).toBe(2025);
    expect(to.getMonth()).toBe(5); // June
  });

  it("falls back to 30d if custom period has missing dates", () => {
    const { from, to } = getDateRange("custom");
    const diffDays = Math.round(
      (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)
    );
    expect(diffDays).toBeGreaterThanOrEqual(30);
  });
});
