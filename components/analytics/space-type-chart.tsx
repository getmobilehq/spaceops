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
import type { SpaceTypeAnalysis } from "@/lib/utils/analytics-queries";

interface SpaceTypeChartProps {
  data: SpaceTypeAnalysis[];
}

function getColor(failRate: number): string {
  if (failRate >= 30) return "#EF4444";
  if (failRate >= 15) return "#F59E0B";
  return "#22C55E";
}

export function SpaceTypeChart({ data }: SpaceTypeChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-slate-200">
        <p className="text-caption text-slate-400">No space type data</p>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    name: d.spaceType,
    failRate: d.failRate,
    inspections: d.totalInspections,
  }));

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ left: 10 }}>
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
            width={100}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid #E2E8F0",
            }}
            formatter={((value: number, _name: string, props: { payload: { inspections: number } }) => [
              `${value}% (${props.payload.inspections} inspections)`,
              "Fail Rate",
            ]) as never}
          />
          <Bar dataKey="failRate" radius={[0, 4, 4, 0]} barSize={20}>
            {chartData.map((entry, index) => (
              <Cell key={index} fill={getColor(entry.failRate)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
