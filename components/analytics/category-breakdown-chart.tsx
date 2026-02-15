"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { CategoryBreakdown } from "@/lib/utils/analytics-queries";

interface CategoryBreakdownChartProps {
  data: CategoryBreakdown[];
}

export function CategoryBreakdownChart({ data }: CategoryBreakdownChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-slate-200">
        <p className="text-caption text-slate-400">No category data</p>
      </div>
    );
  }

  const chartData = data.slice(0, 10).map((d) => ({
    name: d.category.length > 25 ? d.category.slice(0, 25) + "..." : d.category,
    count: d.count,
  }));

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "#94A3B8" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: "#64748B" }}
            tickLine={false}
            axisLine={false}
            width={120}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid #E2E8F0",
            }}
            formatter={((value: number) => [`${value} deficiencies`, "Count"]) as never}
          />
          <Bar dataKey="count" fill="#0F9690" radius={[0, 4, 4, 0]} barSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
