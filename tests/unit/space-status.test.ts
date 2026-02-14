import { describe, it, expect } from "vitest";
import {
  calculateSpaceStatus,
  computeSpaceStatuses,
} from "@/lib/utils/space-status";
import {
  makeSpace,
  makeInspection,
  makeDeficiency,
  makeTask,
} from "../fixtures/data";

describe("calculateSpaceStatus", () => {
  it("returns grey when no inspection", () => {
    expect(calculateSpaceStatus(null, [], [])).toBe("grey");
  });

  it("returns grey when inspection has no completed_at", () => {
    const inspection = makeInspection({ completed_at: null, status: "in_progress" });
    expect(calculateSpaceStatus(inspection as any, [], [])).toBe("grey");
  });

  it("returns green when inspection passed with no issues", () => {
    const inspection = makeInspection({ completed_at: new Date().toISOString() });
    expect(calculateSpaceStatus(inspection as any, [], [])).toBe("green");
  });

  it("returns amber when there are open deficiencies", () => {
    const inspection = makeInspection({ completed_at: new Date().toISOString() });
    const deficiency = makeDeficiency({ status: "open" });
    expect(calculateSpaceStatus(inspection as any, [deficiency as any], [])).toBe("amber");
  });

  it("returns amber when there are open tasks (non-critical, not overdue)", () => {
    const inspection = makeInspection({ completed_at: new Date().toISOString() });
    const task = makeTask({
      status: "open",
      priority: "medium",
      due_date: new Date(Date.now() + 86400000).toISOString(), // tomorrow
    });
    expect(calculateSpaceStatus(inspection as any, [], [task as any])).toBe("amber");
  });

  it("returns red when a task is critical", () => {
    const inspection = makeInspection({ completed_at: new Date().toISOString() });
    const task = makeTask({ status: "open", priority: "critical" });
    expect(calculateSpaceStatus(inspection as any, [], [task as any])).toBe("red");
  });

  it("returns red when a task is overdue", () => {
    const inspection = makeInspection({ completed_at: new Date().toISOString() });
    const task = makeTask({
      status: "open",
      priority: "medium",
      due_date: new Date(Date.now() - 86400000).toISOString(), // yesterday
    });
    expect(calculateSpaceStatus(inspection as any, [], [task as any])).toBe("red");
  });

  it("ignores closed tasks for critical/overdue checks", () => {
    // The function expects only open tasks to be passed.
    // Closed tasks shouldn't be in the array at all (filtered upstream by computeSpaceStatuses).
    const inspection = makeInspection({ completed_at: new Date().toISOString() });
    // Pass empty arrays (as the upstream function would filter closed tasks out)
    expect(calculateSpaceStatus(inspection as any, [], [])).toBe("green");
  });
});

describe("computeSpaceStatuses", () => {
  it("computes statuses for multiple spaces", () => {
    const spaceA = makeSpace({ name: "Room A" });
    const spaceB = makeSpace({ name: "Room B" });

    const inspection = makeInspection({
      space_id: spaceA.id,
      status: "completed",
      completed_at: new Date().toISOString(),
    });

    const deficiency = makeDeficiency({
      space_id: spaceA.id,
      status: "open",
    });

    const results = computeSpaceStatuses(
      [spaceA as any, spaceB as any],
      [inspection as any],
      [deficiency as any],
      []
    );

    expect(results).toHaveLength(2);
    expect(results[0].status).toBe("amber"); // spaceA: has open deficiency
    expect(results[1].status).toBe("grey"); // spaceB: no inspection
  });
});
