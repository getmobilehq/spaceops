"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface DataPoint {
  date: string;
  rate: number;
}

interface TrendChartProps {
  data7: DataPoint[];
  data30: DataPoint[];
  data90: DataPoint[];
}

const periods = [
  { label: "7d", key: "data7" },
  { label: "30d", key: "data30" },
  { label: "90d", key: "data90" },
] as const;

export function TrendChart({ data7, data30, data90 }: TrendChartProps) {
  const [period, setPeriod] = useState<"data7" | "data30" | "data90">("data30");

  const dataMap = { data7, data30, data90 };
  const data = dataMap[period];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-h3 text-slate-900">Completion Trend</h3>
        <div className="flex gap-1">
          {periods.map((p) => (
            <button
              key={p.key}
              className={`rounded-md px-2.5 py-1 text-caption font-semibold transition-colors ${
                period === p.key
                  ? "bg-primary-100 text-primary-700"
                  : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              }`}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-slate-200">
          <p className="text-caption text-slate-400">No data yet</p>
        </div>
      ) : (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#94A3B8" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: "#94A3B8" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid #E2E8F0",
                }}
                formatter={(value) => [`${value}%`, "Pass Rate"]}
              />
              <Line
                type="monotone"
                dataKey="rate"
                stroke="#0E8585"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#0E8585" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
