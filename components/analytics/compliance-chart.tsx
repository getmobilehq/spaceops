"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import type { ComplianceScore } from "@/lib/utils/analytics-queries";

interface ComplianceChartProps {
  data: ComplianceScore[];
}

function getColor(score: number): string {
  if (score >= 90) return "#22C55E";
  if (score >= 70) return "#F59E0B";
  return "#EF4444";
}

export function ComplianceChart({ data }: ComplianceChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-slate-200">
        <p className="text-caption text-slate-400">No compliance data</p>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    name: d.buildingName.length > 20 ? d.buildingName.slice(0, 20) + "..." : d.buildingName,
    score: d.score,
    total: d.totalInspections,
    passed: d.passedInspections,
  }));

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "#94A3B8" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: "#64748B" }}
            tickLine={false}
            axisLine={false}
            width={140}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid #E2E8F0",
            }}
            formatter={((value: number, _name: string, props: { payload: { total: number; passed: number } }) => [
              `${value}% (${props.payload.passed}/${props.payload.total} inspections)`,
              "Compliance",
            ]) as never}
          />
          <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={24}>
            {chartData.map((entry, index) => (
              <Cell key={index} fill={getColor(entry.score)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
