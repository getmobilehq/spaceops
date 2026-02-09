"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatRelativeTime } from "@/lib/utils/format";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Building } from "@/lib/types/helpers";
import type { DeficiencyStatus } from "@/lib/types/database";

interface EnrichedDeficiency {
  id: string;
  space_id: string;
  inspection_id: string;
  response_id: string;
  deficiency_number: string;
  status: DeficiencyStatus;
  resolution_comment: string | null;
  resolution_photo_url: string | null;
  created_at: string;
  resolved_at: string | null;
  spaceName: string;
  buildingName: string;
  buildingId: string;
}

interface DeficiencyListProps {
  deficiencies: EnrichedDeficiency[];
  buildings: Building[];
}

const statusFilters: { label: string; value: DeficiencyStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Open", value: "open" },
  { label: "In Progress", value: "in_progress" },
  { label: "Closed", value: "closed" },
];

export function DeficiencyList({
  deficiencies,
  buildings,
}: DeficiencyListProps) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<DeficiencyStatus | "all">(
    "all"
  );
  const [buildingFilter, setBuildingFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [resolutionComment, setResolutionComment] = useState("");

  const filtered = deficiencies.filter((d) => {
    if (statusFilter !== "all" && d.status !== statusFilter) return false;
    if (buildingFilter !== "all" && d.buildingId !== buildingFilter) return false;
    return true;
  });

  async function handleStatusUpdate(
    defId: string,
    newStatus: DeficiencyStatus
  ) {
    setUpdatingId(defId);
    const supabase = createBrowserSupabaseClient();

    const updates: Record<string, unknown> = { status: newStatus };
    if (newStatus === "closed") {
      updates.resolved_at = new Date().toISOString();
      if (resolutionComment.trim()) {
        updates.resolution_comment = resolutionComment.trim();
      }
    }

    const { error } = await supabase
      .from("deficiencies")
      .update(updates)
      .eq("id", defId);

    if (error) {
      toast.error("Failed to update deficiency");
    } else {
      toast.success(`Deficiency marked as ${newStatus.replace("_", " ")}`);
      setExpandedId(null);
      setResolutionComment("");
      router.refresh();
    }

    setUpdatingId(null);
  }

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* Status pills */}
        <div className="flex gap-1">
          {statusFilters.map((sf) => (
            <button
              key={sf.value}
              className={`rounded-full px-3 py-1.5 text-caption font-semibold transition-colors ${
                statusFilter === sf.value
                  ? "bg-primary-100 text-primary-700"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
              onClick={() => setStatusFilter(sf.value)}
            >
              {sf.label}
            </button>
          ))}
        </div>

        {/* Building filter */}
        {buildings.length > 1 && (
          <select
            value={buildingFilter}
            onChange={(e) => setBuildingFilter(e.target.value)}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-caption text-slate-600"
          >
            <option value="all">All Buildings</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Results count */}
      <p className="mb-3 text-caption text-slate-400">
        {filtered.length} deficienc{filtered.length === 1 ? "y" : "ies"}
      </p>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-sm-body text-slate-400">
            No deficiencies found
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((def) => {
            const isExpanded = expandedId === def.id;
            return (
              <div
                key={def.id}
                className="rounded-lg border border-slate-200 bg-white"
              >
                {/* Card header */}
                <button
                  className="flex w-full items-center gap-3 px-4 py-3 text-left"
                  onClick={() =>
                    setExpandedId(isExpanded ? null : def.id)
                  }
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-caption text-slate-400">
                        {def.deficiency_number}
                      </span>
                      <StatusBadge status={def.status} />
                    </div>
                    <p className="mt-1 truncate text-body font-medium text-slate-900">
                      {def.spaceName}
                    </p>
                    <p className="text-caption text-slate-400">
                      {def.buildingName} · {formatRelativeTime(def.created_at)}
                    </p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                  )}
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-slate-100 px-4 py-3">
                    {def.status !== "closed" && (
                      <div className="space-y-3">
                        <p className="text-caption font-semibold text-slate-500">
                          Update Status
                        </p>
                        <div className="flex gap-2">
                          {def.status === "open" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={updatingId === def.id}
                              onClick={() =>
                                handleStatusUpdate(def.id, "in_progress")
                              }
                            >
                              {updatingId === def.id && (
                                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                              )}
                              Mark In Progress
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={updatingId === def.id}
                            onClick={() =>
                              handleStatusUpdate(def.id, "closed")
                            }
                          >
                            {updatingId === def.id && (
                              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                            )}
                            Close
                          </Button>
                        </div>
                        <textarea
                          className="w-full rounded-md border border-slate-200 px-3 py-2 text-body text-slate-700 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          rows={2}
                          placeholder="Resolution comment (optional)"
                          value={resolutionComment}
                          onChange={(e) =>
                            setResolutionComment(e.target.value)
                          }
                        />
                      </div>
                    )}

                    {def.status === "closed" && (
                      <div>
                        <p className="text-caption text-slate-400">
                          Resolved{" "}
                          {def.resolved_at
                            ? formatRelativeTime(def.resolved_at)
                            : ""}
                        </p>
                        {def.resolution_comment && (
                          <p className="mt-1 text-body text-slate-600">
                            {def.resolution_comment}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          router.push(`/inspect/${def.space_id}`)
                        }
                      >
                        View Space
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
