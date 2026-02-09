"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/utils/format";
import type { RecentInspection } from "@/lib/utils/dashboard-queries";

interface InspectionHistoryProps {
  initialInspections: RecentInspection[];
  buildingId: string;
  userRole: string;
  userId: string;
}

export function InspectionHistory({
  initialInspections,
  buildingId,
  userRole,
  userId,
}: InspectionHistoryProps) {
  const [inspections, setInspections] = useState(initialInspections);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialInspections.length >= 20);

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  async function loadMore() {
    setLoading(true);
    const supabase = createBrowserSupabaseClient();

    // Get the last completed_at for pagination
    const lastItem = inspections[inspections.length - 1];
    if (!lastItem) {
      setLoading(false);
      return;
    }

    // Get floors -> spaces for building
    const { data: floorsData } = await supabase
      .from("floors")
      .select("id")
      .eq("building_id", buildingId);

    const floorIds = (floorsData ?? []).map((f: { id: string }) => f.id);
    if (floorIds.length === 0) {
      setHasMore(false);
      setLoading(false);
      return;
    }

    const { data: spacesData } = await supabase
      .from("spaces")
      .select("id")
      .in("floor_id", floorIds)
      .is("deleted_at", null);

    const spaceIds = (spacesData ?? []).map((s: { id: string }) => s.id);
    if (spaceIds.length === 0) {
      setHasMore(false);
      setLoading(false);
      return;
    }

    // Fetch next page
    const { data: inspData } = await supabase
      .from("inspections")
      .select("*")
      .in("space_id", spaceIds)
      .eq("status", "completed")
      .lt("completed_at", lastItem.completedAt)
      .order("completed_at", { ascending: false })
      .limit(20);

    const newInsp = (inspData ?? []) as unknown as {
      id: string;
      space_id: string;
      inspector_id: string;
      completed_at: string;
    }[];

    if (newInsp.length === 0) {
      setHasMore(false);
      setLoading(false);
      return;
    }

    // Enrich with space/inspector names and counts
    const uniqueSpaceIds = [...new Set(newInsp.map((i) => i.space_id))];
    const inspectorIds = [...new Set(newInsp.map((i) => i.inspector_id))];

    const [{ data: spaces }, { data: users }, { data: responses }] = await Promise.all([
      supabase.from("spaces").select("id, name").in("id", uniqueSpaceIds),
      supabase.from("users").select("id, name").in("id", inspectorIds),
      supabase
        .from("inspection_responses")
        .select("inspection_id, result")
        .in("inspection_id", newInsp.map((i) => i.id)),
    ]);

    const spaceMap = Object.fromEntries(
      (spaces ?? []).map((s: { id: string; name: string }) => [s.id, s.name])
    );
    const userMap = Object.fromEntries(
      (users ?? []).map((u: { id: string; name: string }) => [u.id, u.name])
    );

    const countMap: Record<string, { pass: number; fail: number }> = {};
    for (const r of (responses ?? []) as { inspection_id: string; result: string }[]) {
      if (!countMap[r.inspection_id]) countMap[r.inspection_id] = { pass: 0, fail: 0 };
      if (r.result === "pass") countMap[r.inspection_id].pass++;
      else if (r.result === "fail") countMap[r.inspection_id].fail++;
    }

    const enriched: RecentInspection[] = newInsp.map((i) => ({
      id: i.id,
      spaceId: i.space_id,
      spaceName: spaceMap[i.space_id] ?? "Unknown",
      inspectorName: userMap[i.inspector_id] ?? "Unknown",
      completedAt: i.completed_at,
      passCount: countMap[i.id]?.pass ?? 0,
      failCount: countMap[i.id]?.fail ?? 0,
    }));

    setInspections((prev) => [...prev, ...enriched]);
    setHasMore(newInsp.length >= 20);
    setLoading(false);
  }

  if (inspections.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-sm-body text-slate-400">No inspections completed yet</p>
      </div>
    );
  }

  return (
    <div>
      <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
        {inspections.map((insp) => {
          const total = insp.passCount + insp.failCount;
          const isEditable =
            new Date(insp.completedAt) > threeMonthsAgo &&
            (userRole === "admin");

          return (
            <div
              key={insp.id}
              className="flex items-center gap-3 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-body font-medium text-slate-900">
                  {insp.spaceName}
                </p>
                <p className="text-caption text-slate-400">
                  {insp.inspectorName} &middot;{" "}
                  {formatRelativeTime(insp.completedAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {total > 0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      insp.failCount === 0
                        ? "bg-pass-bg text-pass"
                        : "bg-fail-bg text-fail"
                    }`}
                  >
                    {insp.passCount}/{total}
                  </span>
                )}
                {isEditable && (
                  <Link href={`/inspect/${insp.spaceId}/checklist?edit=${insp.id}`}>
                    <span className="text-caption font-semibold text-primary-600 hover:text-primary-700">
                      Edit
                    </span>
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <div className="mt-4 text-center">
          <Button
            variant="outline"
            size="sm"
            onClick={loadMore}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Load More"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
