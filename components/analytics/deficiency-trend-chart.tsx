"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import type { DeficiencyTrendPoint } from "@/lib/utils/analytics-queries";

interface DeficiencyTrendChartProps {
  data: DeficiencyTrendPoint[];
}

export function DeficiencyTrendChart({ data }: DeficiencyTrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-slate-200">
        <p className="text-caption text-slate-400">No deficiency data</p>
      </div>
    );
  }

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#94A3B8" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#94A3B8" }}
            tickLine={false}
            axisLine={false}
            width={30}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid #E2E8F0",
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area
            type="monotone"
            dataKey="opened"
            name="Opened"
            stroke="#DC2626"
            fill="#DC2626"
            fillOpacity={0.1}
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="closed"
            name="Closed"
            stroke="#16A34A"
            fill="#16A34A"
            fillOpacity={0.1}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
