"use client";

import { DateRangePicker } from "@/components/analytics/date-range-picker";
import { ComplianceChart } from "@/components/analytics/compliance-chart";
import { InspectorTable } from "@/components/analytics/inspector-table";
import { DeficiencyTrendChart } from "@/components/analytics/deficiency-trend-chart";
import { CategoryBreakdownChart } from "@/components/analytics/category-breakdown-chart";
import { SpaceTypeChart } from "@/components/analytics/space-type-chart";
import type {
  ComplianceScore,
  InspectorPerformance,
  DeficiencyTrends,
  SpaceTypeAnalysis,
} from "@/lib/utils/analytics-queries";
import { ShieldCheck, Users, AlertTriangle, Layers } from "lucide-react";

interface AnalyticsClientProps {
  complianceScores: ComplianceScore[];
  inspectorPerformance: InspectorPerformance[];
  deficiencyTrends: DeficiencyTrends;
  spaceTypeAnalysis: SpaceTypeAnalysis[];
}

export function AnalyticsClient({
  complianceScores,
  inspectorPerformance,
  deficiencyTrends,
  spaceTypeAnalysis,
}: AnalyticsClientProps) {
  // Compute average compliance
  const avgCompliance =
    complianceScores.length > 0
      ? Math.round(
          complianceScores.reduce((sum, s) => sum + s.score, 0) /
            complianceScores.length
        )
      : null;

  const totalInspections = inspectorPerformance.reduce(
    (sum, i) => sum + i.inspectionCount,
    0
  );

  const totalDeficienciesOpened = deficiencyTrends.daily.reduce(
    (sum, d) => sum + d.opened,
    0
  );

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-h1 text-slate-900">Analytics</h1>
          <p className="mt-1 text-sm text-slate-500">
            Compliance, performance, and trends
          </p>
        </div>
        <DateRangePicker />
      </div>

      {/* Summary KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard
          label="Avg Compliance"
          value={avgCompliance !== null ? `${avgCompliance}%` : "--"}
          icon={ShieldCheck}
          color={
            avgCompliance === null
              ? "slate"
              : avgCompliance >= 90
                ? "green"
                : avgCompliance >= 70
                  ? "amber"
                  : "red"
          }
        />
        <SummaryCard
          label="Total Inspections"
          value={totalInspections}
          icon={Users}
          color="slate"
        />
        <SummaryCard
          label="Deficiencies Opened"
          value={totalDeficienciesOpened}
          icon={AlertTriangle}
          color={totalDeficienciesOpened > 0 ? "amber" : "green"}
        />
        <SummaryCard
          label="Space Types Tracked"
          value={spaceTypeAnalysis.length}
          icon={Layers}
          color="slate"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Compliance Scores */}
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary-600" />
            <h3 className="text-h3 text-slate-900">Building Compliance</h3>
          </div>
          <ComplianceChart data={complianceScores} />
        </div>

        {/* Inspector Performance */}
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-primary-600" />
            <h3 className="text-h3 text-slate-900">Inspector Performance</h3>
          </div>
          <InspectorTable data={inspectorPerformance} />
        </div>

        {/* Deficiency Trends */}
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <h3 className="text-h3 text-slate-900">Deficiency Trends</h3>
          </div>
          <DeficiencyTrendChart data={deficiencyTrends.daily} />
        </div>

        {/* Category Breakdown */}
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-primary-600" />
            <h3 className="text-h3 text-slate-900">Deficiencies by Category</h3>
          </div>
          <CategoryBreakdownChart data={deficiencyTrends.byCategory} />
        </div>

        {/* Space Type Analysis - Full width */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 lg:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary-600" />
            <h3 className="text-h3 text-slate-900">Fail Rate by Space Type</h3>
          </div>
          <SpaceTypeChart data={spaceTypeAnalysis} />
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: "green" | "amber" | "red" | "slate";
}) {
  const colorMap = {
    green: "text-pass",
    amber: "text-warning",
    red: "text-fail",
    slate: "text-slate-600",
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-slate-400" />
        <span className="text-caption text-slate-500">{label}</span>
      </div>
      <p className={`mt-1 text-kpi ${colorMap[color]}`}>{value}</p>
    </div>
  );
}
