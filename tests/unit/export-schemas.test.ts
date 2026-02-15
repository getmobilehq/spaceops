import { describe, it, expect } from "vitest";
import {
  exportTasksSchema,
  exportDeficienciesSchema,
  exportInspectionsSchema,
  analyticsFilterSchema,
} from "@/lib/validators/schemas";

describe("exportTasksSchema", () => {
  it("accepts valid filters", () => {
    const result = exportTasksSchema.safeParse({
      status: "open",
      priority: "high",
      building_id: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty object", () => {
    const result = exportTasksSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects invalid UUID for building_id", () => {
    const result = exportTasksSchema.safeParse({
      building_id: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("accepts date range filters", () => {
    const result = exportTasksSchema.safeParse({
      date_from: "2025-01-01",
      date_to: "2025-12-31",
    });
    expect(result.success).toBe(true);
  });
});

describe("exportDeficienciesSchema", () => {
  it("accepts empty object", () => {
    const result = exportDeficienciesSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts status filter", () => {
    const result = exportDeficienciesSchema.safeParse({
      status: "closed",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status", () => {
    const result = exportDeficienciesSchema.safeParse({
      status: "invalid_status",
    });
    expect(result.success).toBe(false);
  });
});

describe("exportInspectionsSchema", () => {
  it("accepts building_id filter", () => {
    const result = exportInspectionsSchema.safeParse({
      building_id: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty object", () => {
    const result = exportInspectionsSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe("analyticsFilterSchema", () => {
  it("defaults period to '30d'", () => {
    const result = analyticsFilterSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.period).toBe("30d");
    }
  });

  it("accepts valid period values", () => {
    for (const period of ["7d", "30d", "90d", "custom"]) {
      const result = analyticsFilterSchema.safeParse({ period });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid period", () => {
    const result = analyticsFilterSchema.safeParse({ period: "15d" });
    expect(result.success).toBe(false);
  });

  it("accepts optional building_id", () => {
    const result = analyticsFilterSchema.safeParse({
      building_id: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });
});
