"use client";

import Link from "next/link";
import { Building2, AlertTriangle, ChevronRight, TrendingUp, TrendingDown, Download, Loader2 } from "lucide-react";
import { CompletionBar } from "./completion-bar";
import { useState } from "react";
import { toast } from "sonner";

interface ClientBuildingCardProps {
  id: string;
  name: string;
  address: string;
  passRate: number | null;
  openDeficiencyCount: number;
  inspectedToday: number;
  totalSpaces: number;
  complianceScore: number | null;
  monthlyCompletionRate: number | null;
  deficiencyTrend: number;
}

export function ClientBuildingCard({
  id,
  name,
  address,
  passRate,
  openDeficiencyCount,
  inspectedToday,
  totalSpaces,
  complianceScore,
  monthlyCompletionRate,
  deficiencyTrend,
}: ClientBuildingCardProps) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownloadReport(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDownloading(true);

    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ building_id: id }),
      });

      if (!res.ok) throw new Error("Failed to generate report");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report_${name.replace(/\s+/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Report downloaded");
    } catch {
      toast.error("Failed to download report");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Link href={`/buildings/${id}`}>
      <div className="rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
              <Building2 className="h-4 w-4 text-slate-500" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-body font-semibold text-slate-900">
                {name}
              </p>
              {address && (
                <p className="truncate text-caption text-slate-400">
                  {address}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleDownloadReport}
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              title="Download Report"
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
            </button>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
          </div>
        </div>

        {/* Compliance + Pass Rate badges */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {complianceScore !== null && (
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                complianceScore >= 90
                  ? "bg-pass-bg text-pass"
                  : complianceScore >= 70
                    ? "bg-warning-bg text-warning"
                    : "bg-fail-bg text-fail"
              }`}
            >
              {complianceScore}% compliance
            </span>
          )}
          {passRate !== null && (
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                passRate >= 90
                  ? "bg-pass-bg text-pass"
                  : passRate >= 70
                    ? "bg-warning-bg text-warning"
                    : "bg-fail-bg text-fail"
              }`}
            >
              {passRate}% pass
            </span>
          )}
        </div>

        {/* Deficiencies + trend */}
        <div className="mt-2 flex items-center gap-3">
          {openDeficiencyCount > 0 && (
            <span className="flex items-center gap-1 text-caption text-slate-500">
              <AlertTriangle className="h-3 w-3 text-warning" />
              {openDeficiencyCount} open
            </span>
          )}
          {deficiencyTrend !== 0 && (
            <span
              className={`flex items-center gap-0.5 text-caption font-medium ${
                deficiencyTrend > 0 ? "text-fail" : "text-pass"
              }`}
            >
              {deficiencyTrend > 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {Math.abs(deficiencyTrend)} vs prev period
            </span>
          )}
          {monthlyCompletionRate !== null && (
            <span className="text-caption text-slate-400">
              {monthlyCompletionRate}% monthly completion
            </span>
          )}
        </div>

        {/* Completion bar */}
        {totalSpaces > 0 && (
          <div className="mt-3">
            <CompletionBar
              completed={inspectedToday}
              total={totalSpaces}
              label="Inspected today"
            />
          </div>
        )}
      </div>
    </Link>
  );
}
