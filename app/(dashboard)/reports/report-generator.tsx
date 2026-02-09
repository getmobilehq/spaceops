"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FileText, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import type { Building } from "@/lib/types/helpers";

interface ReportGeneratorProps {
  buildings: Building[];
}

const dateRangeOptions = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
];

export function ReportGenerator({ buildings }: ReportGeneratorProps) {
  const [buildingId, setBuildingId] = useState(buildings[0]?.id ?? "");
  const [rangeDays, setRangeDays] = useState(30);
  const [reportType, setReportType] = useState<"summary" | "detailed">(
    "summary"
  );
  const [generating, setGenerating] = useState(false);

  async function handleGenerate() {
    if (!buildingId) {
      toast.error("Please select a building");
      return;
    }

    setGenerating(true);

    const dateTo = new Date();
    const dateFrom = new Date(dateTo.getTime() - rangeDays * 86400000);

    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          building_id: buildingId,
          date_from: dateFrom.toISOString(),
          date_to: dateTo.toISOString(),
          report_type: reportType,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to generate report");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        res.headers.get("Content-Disposition")?.split("filename=")[1]?.replace(/"/g, "") ??
        "report.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Report downloaded");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to generate report"
      );
    }

    setGenerating(false);
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <div className="space-y-5">
        {/* Building */}
        <div>
          <Label>Building</Label>
          <select
            value={buildingId}
            onChange={(e) => setBuildingId(e.target.value)}
            className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-body text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {buildings.length === 0 && (
              <option value="">No buildings available</option>
            )}
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range */}
        <div>
          <Label>Date Range</Label>
          <div className="mt-1.5 flex gap-2">
            {dateRangeOptions.map((opt) => (
              <button
                key={opt.days}
                className={`rounded-full px-3 py-1.5 text-caption font-semibold transition-colors ${
                  rangeDays === opt.days
                    ? "bg-primary-100 text-primary-700"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
                onClick={() => setRangeDays(opt.days)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Report Type */}
        <div>
          <Label>Report Type</Label>
          <div className="mt-1.5 flex gap-2">
            <button
              className={`rounded-full px-3 py-1.5 text-caption font-semibold transition-colors ${
                reportType === "summary"
                  ? "bg-primary-100 text-primary-700"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
              onClick={() => setReportType("summary")}
            >
              Summary
            </button>
            <button
              className={`rounded-full px-3 py-1.5 text-caption font-semibold transition-colors ${
                reportType === "detailed"
                  ? "bg-primary-100 text-primary-700"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
              onClick={() => setReportType("detailed")}
            >
              Detailed
            </button>
          </div>
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={generating || !buildingId}
          className="w-full"
        >
          {generating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          {generating ? "Generating..." : "Generate Report"}
        </Button>
      </div>
    </div>
  );
}
