"use client";

import { useControls } from "react-zoom-pan-pinch";
import { Plus, Minus, Maximize2 } from "lucide-react";

export function MapControls() {
  const { zoomIn, zoomOut, resetTransform } = useControls();

  return (
    <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-1 rounded-lg border border-slate-200 bg-white shadow-md">
      <button
        onClick={() => zoomIn()}
        className="flex h-9 w-9 items-center justify-center rounded-t-lg text-slate-600 transition-colors hover:bg-slate-50"
      >
        <Plus className="h-4 w-4" />
      </button>
      <div className="border-t border-slate-200" />
      <button
        onClick={() => zoomOut()}
        className="flex h-9 w-9 items-center justify-center text-slate-600 transition-colors hover:bg-slate-50"
      >
        <Minus className="h-4 w-4" />
      </button>
      <div className="border-t border-slate-200" />
      <button
        onClick={() => resetTransform()}
        className="flex h-9 w-9 items-center justify-center rounded-b-lg text-slate-600 transition-colors hover:bg-slate-50"
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
