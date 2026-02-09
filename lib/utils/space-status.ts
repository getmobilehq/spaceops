import type { Space, Inspection, Deficiency, Task } from "@/lib/types/helpers";

export type SpaceStatus = "green" | "amber" | "red" | "grey";

export interface SpaceWithStatus {
  spaceId: string;
  spaceName: string;
  floorId: string;
  pinX: number | null;
  pinY: number | null;
  status: SpaceStatus;
  openDeficiencyCount: number;
  lastInspectedAt: string | null;
}

export function calculateSpaceStatus(
  lastInspection: Inspection | null,
  openDeficiencies: Deficiency[],
  openTasks: Task[]
): SpaceStatus {
  if (!lastInspection?.completed_at) return "grey";

  const hasCritical = openTasks.some(
    (t) => t.priority === "critical" && t.status !== "closed"
  );
  const hasOverdue = openTasks.some((t) => {
    if (!t.due_date || t.status === "closed") return false;
    return new Date(t.due_date) < new Date();
  });

  if (hasCritical || hasOverdue) return "red";

  if (openDeficiencies.length > 0 || openTasks.length > 0) return "amber";

  return "green";
}

export function computeSpaceStatuses(
  spaces: Space[],
  inspections: Inspection[],
  deficiencies: Deficiency[],
  tasks: Task[]
): SpaceWithStatus[] {
  return spaces.map((space) => {
    // Find the latest completed inspection for this space
    const spaceInspections = inspections
      .filter((i) => i.space_id === space.id && i.status === "completed")
      .sort(
        (a, b) =>
          new Date(b.completed_at!).getTime() -
          new Date(a.completed_at!).getTime()
      );
    const lastInspection = spaceInspections[0] || null;

    // Open deficiencies for this space
    const openDefs = deficiencies.filter(
      (d) =>
        d.space_id === space.id &&
        (d.status === "open" || d.status === "in_progress")
    );

    // Open tasks for this space
    const openTasks = tasks.filter(
      (t) =>
        t.space_id === space.id &&
        (t.status === "open" || t.status === "in_progress")
    );

    return {
      spaceId: space.id,
      spaceName: space.name,
      floorId: space.floor_id,
      pinX: space.pin_x,
      pinY: space.pin_y,
      status: calculateSpaceStatus(lastInspection, openDefs, openTasks),
      openDeficiencyCount: openDefs.length,
      lastInspectedAt: lastInspection?.completed_at ?? null,
    };
  });
}

export const STATUS_COLORS: Record<SpaceStatus, string> = {
  green: "bg-pin-green",
  amber: "bg-pin-amber",
  red: "bg-pin-red",
  grey: "bg-pin-grey",
};

export const STATUS_LABELS: Record<SpaceStatus, string> = {
  green: "Passed",
  amber: "Open Issues",
  red: "Critical",
  grey: "Not Inspected",
};
