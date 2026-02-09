"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { X, Save, Loader2, GripVertical } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { SpaceWithStatus, SpaceStatus } from "@/lib/utils/space-status";

interface PinEditorProps {
  signedImageUrl: string;
  spacesWithStatus: SpaceWithStatus[];
  onClose: () => void;
}

interface PinPosition {
  spaceId: string;
  spaceName: string;
  status: SpaceStatus;
  pinX: number;
  pinY: number;
}

const dotColors: Record<SpaceStatus, string> = {
  green: "bg-pin-green",
  amber: "bg-pin-amber",
  red: "bg-pin-red",
  grey: "bg-pin-grey",
};

export function PinEditor({
  signedImageUrl,
  spacesWithStatus,
  onClose,
}: PinEditorProps) {
  const imageRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);

  // Separate placed and unplaced spaces
  const initialPlaced: PinPosition[] = spacesWithStatus
    .filter((s) => s.pinX !== null && s.pinY !== null)
    .map((s) => ({
      spaceId: s.spaceId,
      spaceName: s.spaceName,
      status: s.status,
      pinX: s.pinX!,
      pinY: s.pinY!,
    }));

  const [placedPins, setPlacedPins] = useState<PinPosition[]>(initialPlaced);
  const [selectedSpace, setSelectedSpace] = useState<string | null>(null);
  const [draggingPin, setDraggingPin] = useState<string | null>(null);

  const unplacedSpaces = spacesWithStatus.filter(
    (s) => !placedPins.some((p) => p.spaceId === s.spaceId)
  );

  const calcPercent = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      if (!imageRef.current) return null;
      const rect = imageRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
      return { x, y };
    },
    []
  );

  function handleMapClick(e: React.PointerEvent) {
    if (draggingPin) return;

    const pos = calcPercent(e.clientX, e.clientY);
    if (!pos) return;

    if (selectedSpace) {
      // Place the selected space
      const space = spacesWithStatus.find((s) => s.spaceId === selectedSpace);
      if (space) {
        setPlacedPins((prev) => [
          ...prev.filter((p) => p.spaceId !== selectedSpace),
          {
            spaceId: space.spaceId,
            spaceName: space.spaceName,
            status: space.status,
            pinX: pos.x,
            pinY: pos.y,
          },
        ]);
        setSelectedSpace(null);
      }
    }
  }

  function handlePinPointerDown(e: React.PointerEvent, spaceId: string) {
    e.stopPropagation();
    e.preventDefault();
    setDraggingPin(spaceId);

    const onMove = (me: PointerEvent) => {
      const pos = calcPercent(me.clientX, me.clientY);
      if (!pos) return;
      setPlacedPins((prev) =>
        prev.map((p) =>
          p.spaceId === spaceId ? { ...p, pinX: pos.x, pinY: pos.y } : p
        )
      );
    };

    const onUp = () => {
      setDraggingPin(null);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function handleRemovePin(spaceId: string) {
    setPlacedPins((prev) => prev.filter((p) => p.spaceId !== spaceId));
  }

  async function handleSave() {
    setSaving(true);
    const supabase = createBrowserSupabaseClient();

    try {
      // Update all placed pins
      const updates = placedPins.map((pin) =>
        supabase
          .from("spaces")
          .update({ pin_x: pin.pinX, pin_y: pin.pinY })
          .eq("id", pin.spaceId)
      );

      // Clear pins for spaces that were removed
      const removedSpaces = initialPlaced
        .filter((ip) => !placedPins.some((p) => p.spaceId === ip.spaceId))
        .map((ip) =>
          supabase
            .from("spaces")
            .update({ pin_x: null, pin_y: null })
            .eq("id", ip.spaceId)
        );

      await Promise.all([...updates, ...removedSpaces]);
      toast.success("Pin positions saved");
      onClose();
    } catch {
      toast.error("Failed to save pin positions");
    }

    setSaving(false);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2">
        <div className="flex items-center gap-2">
          <h3 className="text-h3 text-slate-900">Edit Pins</h3>
          <span className="text-caption text-slate-400">
            {unplacedSpaces.length} unplaced
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={saving}
          >
            <X className="mr-1 h-3.5 w-3.5" />
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="mr-1 h-3.5 w-3.5" />
            )}
            Save
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Unplaced spaces panel */}
        <div className="w-56 shrink-0 overflow-y-auto border-r border-slate-200 bg-slate-50">
          <div className="p-3">
            <p className="mb-2 text-label uppercase text-slate-400">
              Unplaced Spaces
            </p>
            {unplacedSpaces.length === 0 ? (
              <p className="text-caption text-slate-400">
                All spaces have pins
              </p>
            ) : (
              <div className="flex flex-col gap-1">
                {unplacedSpaces.map((space) => (
                  <button
                    key={space.spaceId}
                    className={`flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-caption transition-colors ${
                      selectedSpace === space.spaceId
                        ? "bg-primary-100 text-primary-700"
                        : "text-slate-600 hover:bg-white"
                    }`}
                    onClick={() =>
                      setSelectedSpace(
                        selectedSpace === space.spaceId
                          ? null
                          : space.spaceId
                      )
                    }
                  >
                    <div
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotColors[space.status]}`}
                    />
                    <span className="truncate">{space.spaceName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Placed pins list */}
          {placedPins.length > 0 && (
            <div className="border-t border-slate-200 p-3">
              <p className="mb-2 text-label uppercase text-slate-400">
                Placed Pins
              </p>
              <div className="flex flex-col gap-1">
                {placedPins.map((pin) => (
                  <div
                    key={pin.spaceId}
                    className="flex items-center gap-2 rounded-md px-2.5 py-1.5"
                  >
                    <div
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotColors[pin.status]}`}
                    />
                    <span className="flex-1 truncate text-caption text-slate-600">
                      {pin.spaceName}
                    </span>
                    <button
                      className="shrink-0 text-slate-400 hover:text-fail"
                      onClick={() => handleRemovePin(pin.spaceId)}
                      title="Remove pin"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Map area */}
        <div className="relative flex-1 overflow-auto bg-slate-100">
          {selectedSpace && (
            <div className="absolute left-1/2 top-3 z-30 -translate-x-1/2 rounded-md bg-slate-900 px-3 py-1.5 text-caption text-white shadow-lg">
              Click on the map to place &quot;
              {spacesWithStatus.find((s) => s.spaceId === selectedSpace)
                ?.spaceName}
              &quot;
            </div>
          )}

          <div
            ref={imageRef}
            className={`relative inline-block ${
              selectedSpace ? "cursor-crosshair" : ""
            }`}
            onPointerDown={handleMapClick}
          >
            <img
              src={signedImageUrl}
              alt="Floor plan"
              className="max-w-full"
              draggable={false}
            />

            {/* Placed pins */}
            {placedPins.map((pin) => (
              <div
                key={pin.spaceId}
                className="absolute z-10 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none active:cursor-grabbing"
                style={{ left: `${pin.pinX}%`, top: `${pin.pinY}%` }}
                onPointerDown={(e) => handlePinPointerDown(e, pin.spaceId)}
              >
                <div className="flex items-center gap-1 rounded-full border-2 border-white bg-white px-1.5 py-0.5 shadow-md">
                  <GripVertical className="h-3 w-3 text-slate-400" />
                  <div
                    className={`h-3.5 w-3.5 rounded-full ${dotColors[pin.status]}`}
                  />
                </div>
                <div className="absolute left-1/2 top-full mt-0.5 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-1.5 py-0.5 text-[10px] text-white">
                  {pin.spaceName}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
