"use client";

import { useState } from "react";
import {
  TransformWrapper,
  TransformComponent,
} from "react-zoom-pan-pinch";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import type { FloorPlan } from "@/lib/types/helpers";
import type { SpaceWithStatus } from "@/lib/utils/space-status";
import { StatusPin } from "./status-pin";
import { MapControls } from "./map-controls";
import { PinEditor } from "./pin-editor";

interface FloorPlanViewerProps {
  signedImageUrl: string;
  floorPlan: FloorPlan;
  spacesWithStatus: SpaceWithStatus[];
  isAdmin: boolean;
  floorId: string;
  buildingId: string;
  orgId: string;
}

export function FloorPlanViewer({
  signedImageUrl,
  floorPlan,
  spacesWithStatus,
  isAdmin,
  floorId,
  buildingId,
  orgId,
}: FloorPlanViewerProps) {
  const [editMode, setEditMode] = useState(false);

  if (editMode && isAdmin) {
    return (
      <PinEditor
        signedImageUrl={signedImageUrl}
        spacesWithStatus={spacesWithStatus}
        onClose={() => setEditMode(false)}
      />
    );
  }

  return (
    <div className="relative h-full w-full">
      {/* Admin edit button */}
      {isAdmin && (
        <Button
          variant="outline"
          size="sm"
          className="absolute left-4 top-4 z-20 bg-white shadow-sm"
          onClick={() => setEditMode(true)}
        >
          <Pencil className="mr-1.5 h-3.5 w-3.5" />
          Edit Pins
        </Button>
      )}

      <TransformWrapper
        initialScale={1}
        minScale={0.5}
        maxScale={4}
        centerOnInit
        limitToBounds={false}
        doubleClick={{ mode: "toggle" }}
        wheel={{ step: 0.1 }}
        pinch={{ step: 5 }}
      >
        <MapControls />
        <TransformComponent
          wrapperStyle={{ width: "100%", height: "100%" }}
          contentStyle={{ width: "100%", height: "100%" }}
        >
          <div className="relative inline-block">
            <img
              src={signedImageUrl}
              alt="Floor plan"
              className="max-h-full max-w-full"
              draggable={false}
              style={{
                width: floorPlan.image_width
                  ? `${floorPlan.image_width}px`
                  : "auto",
                maxWidth: "100%",
                height: "auto",
              }}
            />

            {/* Status pins */}
            {spacesWithStatus
              .filter((s) => s.pinX !== null && s.pinY !== null)
              .map((space) => (
                <StatusPin
                  key={space.spaceId}
                  spaceId={space.spaceId}
                  spaceName={space.spaceName}
                  status={space.status}
                  lastInspectedAt={space.lastInspectedAt}
                  style={{
                    left: `${space.pinX}%`,
                    top: `${space.pinY}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                />
              ))}
          </div>
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}
