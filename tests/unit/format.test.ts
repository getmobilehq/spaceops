import { describe, it, expect, vi, afterEach } from "vitest";
import {
  formatDate,
  formatDateTime,
  formatRelativeTime,
  formatSqft,
} from "@/lib/utils/format";

describe("formatDate", () => {
  it("formats a date string", () => {
    const result = formatDate("2024-06-15T12:00:00Z");
    expect(result).toContain("Jun");
    expect(result).toContain("15");
    expect(result).toContain("2024");
  });

  it("formats a Date object", () => {
    const result = formatDate(new Date("2024-01-01T00:00:00Z"));
    expect(result).toContain("2024");
  });
});

describe("formatDateTime", () => {
  it("includes time components", () => {
    const result = formatDateTime("2024-06-15T14:30:00Z");
    expect(result).toContain("Jun");
    expect(result).toContain("15");
  });
});

describe("formatRelativeTime", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Just now" for very recent times', () => {
    const now = new Date();
    expect(formatRelativeTime(now.toISOString())).toBe("Just now");
  });

  it("returns minutes ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-15T12:10:00Z"));
    const result = formatRelativeTime("2024-06-15T12:05:00Z");
    expect(result).toBe("5m ago");
  });

  it("returns hours ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-15T15:00:00Z"));
    const result = formatRelativeTime("2024-06-15T12:00:00Z");
    expect(result).toBe("3h ago");
  });

  it("returns days ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-18T12:00:00Z"));
    const result = formatRelativeTime("2024-06-15T12:00:00Z");
    expect(result).toBe("3d ago");
  });

  it("falls back to formatted date for >7 days", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-30T12:00:00Z"));
    const result = formatRelativeTime("2024-06-15T12:00:00Z");
    expect(result).toContain("Jun");
    expect(result).toContain("15");
  });
});

describe("formatSqft", () => {
  it("formats with commas and sq ft suffix", () => {
    expect(formatSqft(50000)).toBe("50,000 sq ft");
  });

  it("handles small numbers", () => {
    expect(formatSqft(500)).toBe("500 sq ft");
  });
});
