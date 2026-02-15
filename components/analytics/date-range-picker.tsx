"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Input } from "@/components/ui/input";

const periods = [
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
  { label: "Custom", value: "custom" },
] as const;

function DateRangePickerInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentPeriod = searchParams.get("period") || "30d";
  const [showCustom, setShowCustom] = useState(currentPeriod === "custom");
  const [customFrom, setCustomFrom] = useState(searchParams.get("from") || "");
  const [customTo, setCustomTo] = useState(searchParams.get("to") || "");

  function handlePeriodChange(value: string) {
    if (value === "custom") {
      setShowCustom(true);
      return;
    }
    setShowCustom(false);
    const params = new URLSearchParams();
    params.set("period", value);
    router.replace(`?${params.toString()}`);
  }

  function handleCustomApply() {
    if (!customFrom || !customTo) return;
    const params = new URLSearchParams();
    params.set("period", "custom");
    params.set("from", customFrom);
    params.set("to", customTo);
    router.replace(`?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex gap-1">
        {periods.map((p) => (
          <button
            key={p.value}
            className={`rounded-md px-2.5 py-1 text-caption font-semibold transition-colors ${
              currentPeriod === p.value
                ? "bg-primary-100 text-primary-700"
                : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            }`}
            onClick={() => handlePeriodChange(p.value)}
          >
            {p.label}
          </button>
        ))}
      </div>
      {showCustom && (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="h-7 w-auto text-xs"
          />
          <span className="text-xs text-slate-400">to</span>
          <Input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="h-7 w-auto text-xs"
          />
          <button
            onClick={handleCustomApply}
            className="rounded-md bg-primary-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-primary-700"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}

export function DateRangePicker() {
  return (
    <Suspense fallback={<div className="h-8" />}>
      <DateRangePickerInner />
    </Suspense>
  );
}
