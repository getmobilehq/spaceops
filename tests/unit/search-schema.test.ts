import { describe, it, expect } from "vitest";
import {
  globalSearchSchema,
  createScheduleSchema,
  updateReportScheduleSchema,
} from "@/lib/validators/schemas";

describe("globalSearchSchema", () => {
  it("accepts valid search query", () => {
    const result = globalSearchSchema.safeParse({ q: "test query" });
    expect(result.success).toBe(true);
  });

  it("accepts query with type filter", () => {
    const result = globalSearchSchema.safeParse({ q: "office", type: "buildings" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("buildings");
    }
  });

  it("defaults type to 'all'", () => {
    const result = globalSearchSchema.safeParse({ q: "test" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("all");
    }
  });

  it("rejects query shorter than 2 characters", () => {
    const result = globalSearchSchema.safeParse({ q: "a" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid type", () => {
    const result = globalSearchSchema.safeParse({ q: "test", type: "invalid" });
    expect(result.success).toBe(false);
  });

  it("rejects empty query", () => {
    const result = globalSearchSchema.safeParse({ q: "" });
    expect(result.success).toBe(false);
  });
});

describe("createScheduleSchema", () => {
  it("accepts valid daily schedule", () => {
    const result = createScheduleSchema.safeParse({
      building_id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
      frequency: "daily",
      time_of_day: "09:00",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid weekly schedule with day_of_week", () => {
    const result = createScheduleSchema.safeParse({
      building_id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
      frequency: "weekly",
      day_of_week: 1,
      time_of_day: "14:30",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid monthly schedule with day_of_month", () => {
    const result = createScheduleSchema.safeParse({
      building_id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
      frequency: "monthly",
      day_of_month: 15,
      time_of_day: "08:00",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid building_id", () => {
    const result = createScheduleSchema.safeParse({
      building_id: "not-a-uuid",
      frequency: "daily",
      time_of_day: "09:00",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid time format", () => {
    const result = createScheduleSchema.safeParse({
      building_id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
      frequency: "daily",
      time_of_day: "9am",
    });
    expect(result.success).toBe(false);
  });

  it("rejects day_of_week out of range", () => {
    const result = createScheduleSchema.safeParse({
      building_id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
      frequency: "weekly",
      day_of_week: 7,
      time_of_day: "09:00",
    });
    expect(result.success).toBe(false);
  });

  it("rejects day_of_month out of range", () => {
    const result = createScheduleSchema.safeParse({
      building_id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
      frequency: "monthly",
      day_of_month: 29,
      time_of_day: "09:00",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateReportScheduleSchema", () => {
  it("accepts valid update", () => {
    const result = updateReportScheduleSchema.safeParse({
      building_id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
      enabled: true,
      schedule_cron: "daily",
      recipient_emails: ["test@example.com"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts minimal update (building + enabled only)", () => {
    const result = updateReportScheduleSchema.safeParse({
      building_id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
      enabled: false,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email in recipients", () => {
    const result = updateReportScheduleSchema.safeParse({
      building_id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
      enabled: true,
      recipient_emails: ["not-an-email"],
    });
    expect(result.success).toBe(false);
  });
});
