"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SpaceStatus } from "@/lib/utils/space-status";
import { STATUS_LABELS } from "@/lib/utils/space-status";
import { formatRelativeTime } from "@/lib/utils/format";

interface StatusPinProps {
  spaceId: string;
  spaceName: string;
  status: SpaceStatus;
  lastInspectedAt: string | null;
  style?: React.CSSProperties;
}

const pinColors: Record<SpaceStatus, string> = {
  green: "bg-pin-green",
  amber: "bg-pin-amber",
  red: "bg-pin-red",
  grey: "bg-pin-grey",
};

const pulseColors: Record<string, string> = {
  amber: "animate-pulse",
  red: "animate-pulse",
};

export function StatusPin({
  spaceId,
  spaceName,
  status,
  lastInspectedAt,
  style,
}: StatusPinProps) {
  const router = useRouter();
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${spaceName} — ${STATUS_LABELS[status]}`}
      style={style}
      className="group absolute z-10 cursor-pointer"
      onClick={(e) => {
        e.stopPropagation();
        router.push(`/inspect/${spaceId}`);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(`/inspect/${spaceId}`);
        }
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onFocus={() => setShowTooltip(true)}
      onBlur={() => setShowTooltip(false)}
      onTouchStart={() => setShowTooltip(true)}
      onTouchEnd={() => setTimeout(() => setShowTooltip(false), 2000)}
    >
      {/* Pin dot */}
      <div
        className={`h-4 w-4 rounded-full border-2 border-white shadow-md ${pinColors[status]} ${pulseColors[status] || ""}`}
      />

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2 shadow-lg">
          <p className="text-caption font-semibold text-white">{spaceName}</p>
          <p className="text-[10px] text-slate-400">
            {STATUS_LABELS[status]}
            {lastInspectedAt
              ? ` · ${formatRelativeTime(lastInspectedAt)}`
              : ""}
          </p>
          <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
        </div>
      )}
    </div>
  );
}
