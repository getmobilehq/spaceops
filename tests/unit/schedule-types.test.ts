import { describe, it, expect } from "vitest";
import { makeSchedule } from "@/tests/fixtures/data";
import type { ScheduleFrequency } from "@/lib/types/database";
import type { InspectionSchedule } from "@/lib/types/helpers";

describe("Schedule types and fixtures", () => {
  it("makeSchedule creates valid defaults", () => {
    const schedule = makeSchedule();
    expect(schedule.id).toBeTruthy();
    expect(schedule.org_id).toBeTruthy();
    expect(schedule.building_id).toBeTruthy();
    expect(schedule.frequency).toBe("daily");
    expect(schedule.time_of_day).toBe("09:00");
    expect(schedule.enabled).toBe(true);
    expect(schedule.day_of_week).toBeNull();
    expect(schedule.day_of_month).toBeNull();
  });

  it("makeSchedule accepts overrides", () => {
    const schedule = makeSchedule({
      frequency: "weekly",
      day_of_week: 3,
      enabled: false,
      assigned_to: "user-123",
    });
    expect(schedule.frequency).toBe("weekly");
    expect(schedule.day_of_week).toBe(3);
    expect(schedule.enabled).toBe(false);
    expect(schedule.assigned_to).toBe("user-123");
  });

  it("ScheduleFrequency type accepts valid values", () => {
    const frequencies: ScheduleFrequency[] = [
      "daily",
      "weekly",
      "biweekly",
      "monthly",
    ];
    expect(frequencies).toHaveLength(4);
  });

  it("InspectionSchedule type has required fields", () => {
    // This is a compile-time type check — if it compiles, it passes
    const schedule: InspectionSchedule = {
      id: "test",
      org_id: "test",
      building_id: "test",
      checklist_template_id: null,
      frequency: "daily",
      day_of_week: null,
      day_of_month: null,
      time_of_day: "09:00",
      assigned_to: null,
      enabled: true,
      last_triggered_at: null,
      next_due_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    expect(schedule.frequency).toBe("daily");
  });
});
