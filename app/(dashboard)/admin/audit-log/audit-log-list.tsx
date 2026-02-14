"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/utils/format";
import type { AuditLog } from "@/lib/types/helpers";
import { cn } from "@/lib/utils";

const TABLE_OPTIONS = [
  "all",
  "buildings",
  "spaces",
  "inspections",
  "tasks",
  "deficiencies",
  "checklist_templates",
  "checklist_items",
  "users",
  "organizations",
  "inspection_responses",
] as const;

const ACTION_OPTIONS = ["all", "INSERT", "UPDATE", "DELETE"] as const;

const DATE_RANGE_OPTIONS = [
  { label: "Last 24h", hours: 24 },
  { label: "Last 7d", hours: 168 },
  { label: "Last 30d", hours: 720 },
  { label: "All time", hours: 0 },
] as const;

const ACTION_STYLES: Record<string, string> = {
  INSERT: "bg-pass-bg text-pass border-pass-border",
  UPDATE: "bg-warning-bg text-warning border-warning-border",
  DELETE: "bg-fail-bg text-fail border-fail-border",
};

interface AuditLogListProps {
  initialLogs: AuditLog[];
  userMap: Record<string, string>;
  orgId: string;
}

export function AuditLogList({ initialLogs, userMap, orgId }: AuditLogListProps) {
  const [logs, setLogs] = useState<AuditLog[]>(initialLogs);
  const [users, setUsers] = useState<Record<string, string>>(userMap);
  const [tableFilter, setTableFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [dateRange, setDateRange] = useState(720); // 30d default
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialLogs.length === 50);

  async function fetchLogs(offset = 0, append = false) {
    setLoading(true);
    const supabase = createBrowserSupabaseClient();

    let query = supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50)
      .range(offset, offset + 49);

    if (tableFilter !== "all") {
      query = query.eq("table_name", tableFilter);
    }
    if (actionFilter !== "all") {
      query = query.eq("action", actionFilter as "INSERT" | "UPDATE" | "DELETE");
    }
    if (dateRange > 0) {
      const since = new Date(Date.now() - dateRange * 3600000).toISOString();
      query = query.gte("created_at", since);
    }

    const { data } = await query;
    const newLogs = (data ?? []) as unknown as AuditLog[];

    // Fetch any new user names
    const newUserIds = newLogs
      .map((l) => l.user_id)
      .filter((id): id is string => !!id && !users[id]);
    if (newUserIds.length > 0) {
      const { data: uData } = await supabase
        .from("users")
        .select("id, name")
        .in("id", [...new Set(newUserIds)]);
      const newUserMap = Object.fromEntries(
        (uData ?? []).map((u: { id: string; name: string }) => [u.id, u.name])
      );
      setUsers((prev) => ({ ...prev, ...newUserMap }));
    }

    if (append) {
      setLogs((prev) => [...prev, ...newLogs]);
    } else {
      setLogs(newLogs);
    }
    setHasMore(newLogs.length === 50);
    setLoading(false);
  }

  function handleFilterChange() {
    fetchLogs(0, false);
  }

  function summarizeChanges(log: AuditLog): string {
    if (log.action === "INSERT") {
      return `Created ${log.table_name} record`;
    }
    if (log.action === "DELETE") {
      return `Deleted ${log.table_name} record`;
    }
    // UPDATE: summarize changed fields
    if (log.old_values && log.new_values) {
      const oldV = log.old_values as Record<string, unknown>;
      const newV = log.new_values as Record<string, unknown>;
      const changed = Object.keys(newV).filter(
        (k) =>
          k !== "updated_at" &&
          k !== "created_at" &&
          JSON.stringify(oldV[k]) !== JSON.stringify(newV[k])
      );
      if (changed.length === 0) return "No field changes";
      if (changed.length <= 3) return `Updated ${changed.join(", ")}`;
      return `Updated ${changed.length} fields`;
    }
    return `Updated ${log.table_name} record`;
  }

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <select
          value={tableFilter}
          onChange={(e) => {
            setTableFilter(e.target.value);
            setTimeout(handleFilterChange, 0);
          }}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-caption text-slate-700"
        >
          {TABLE_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t === "all" ? "All tables" : t.replace(/_/g, " ")}
            </option>
          ))}
        </select>

        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setTimeout(handleFilterChange, 0);
          }}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-caption text-slate-700"
        >
          {ACTION_OPTIONS.map((a) => (
            <option key={a} value={a}>
              {a === "all" ? "All actions" : a}
            </option>
          ))}
        </select>

        <select
          value={dateRange}
          onChange={(e) => {
            setDateRange(Number(e.target.value));
            setTimeout(handleFilterChange, 0);
          }}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-caption text-slate-700"
        >
          {DATE_RANGE_OPTIONS.map((d) => (
            <option key={d.hours} value={d.hours}>
              {d.label}
            </option>
          ))}
        </select>
      </div>

      {/* Log entries */}
      {logs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-body text-slate-500">No audit entries found</p>
        </div>
      ) : (
        <div className="space-y-1">
          {logs.map((log) => {
            const isExpanded = expandedId === log.id;
            return (
              <div key={log.id} className="rounded-lg border border-slate-200 bg-white">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                  )}

                  {/* Action badge */}
                  <span
                    className={cn(
                      "shrink-0 rounded-sm border px-1.5 py-0.5 text-[10px] font-bold uppercase",
                      ACTION_STYLES[log.action] ?? "bg-slate-100 text-slate-600"
                    )}
                  >
                    {log.action}
                  </span>

                  {/* Table pill */}
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-caption text-slate-600">
                    {log.table_name.replace(/_/g, " ")}
                  </span>

                  {/* Summary */}
                  <span className="min-w-0 flex-1 truncate text-body text-slate-700">
                    {summarizeChanges(log)}
                  </span>

                  {/* User + time */}
                  <span className="shrink-0 text-caption text-slate-500">
                    {log.user_id ? users[log.user_id] ?? "System" : "System"}
                  </span>
                  <span className="shrink-0 text-caption text-slate-400">
                    {formatRelativeTime(log.created_at)}
                  </span>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-slate-100 px-4 py-3">
                    <div className="grid gap-3 text-caption">
                      <div>
                        <span className="font-semibold text-slate-500">Record ID:</span>{" "}
                        <span className="font-mono text-slate-700">{log.record_id}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-500">Timestamp:</span>{" "}
                        <span className="text-slate-700">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                      {log.old_values && (
                        <div>
                          <p className="mb-1 font-semibold text-slate-500">Previous values:</p>
                          <pre className="max-h-40 overflow-auto rounded bg-slate-50 p-2 text-[11px] text-slate-600">
                            {JSON.stringify(log.old_values, null, 2)}
                          </pre>
                        </div>
                      )}
                      {log.new_values && (
                        <div>
                          <p className="mb-1 font-semibold text-slate-500">New values:</p>
                          <pre className="max-h-40 overflow-auto rounded bg-slate-50 p-2 text-[11px] text-slate-600">
                            {JSON.stringify(log.new_values, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <div className="mt-4 text-center">
          <Button
            variant="secondary"
            size="sm"
            disabled={loading}
            onClick={() => fetchLogs(logs.length, true)}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Loading...
              </>
            ) : (
              "Load more"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
