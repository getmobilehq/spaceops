"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  XCircle,
  Camera,
  Loader2,
  Clock,
  X,
  ArrowLeft,
  Send,
} from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useInspectionStore } from "@/lib/stores/inspection-store";
import { compressPhoto, generatePhotoPath } from "@/lib/utils/photos";
import { toast } from "sonner";
import Link from "next/link";
import type {
  Inspection,
  Space,
  ChecklistTemplate,
  ChecklistItem,
  InspectionResponse,
} from "@/lib/types/helpers";

interface ChecklistFormProps {
  inspection: Inspection;
  space: Space;
  template: ChecklistTemplate;
  items: ChecklistItem[];
  floorName: string;
  buildingName: string;
  buildingId: string;
  orgId: string;
  userId: string;
  editMode?: boolean;
  existingResponses?: InspectionResponse[];
}

export function ChecklistForm({
  inspection,
  space,
  template,
  items,
  floorName,
  buildingName,
  buildingId,
  orgId,
  userId,
  editMode = false,
  existingResponses = [],
}: ChecklistFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [uploadingItem, setUploadingItem] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activePhotoItemRef = useRef<string | null>(null);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    responses,
    isDirty,
    init,
    setResult,
    setComment,
    addPhoto,
    removePhoto,
    loadFromStorage,
    markClean,
    reset,
  } = useInspectionStore();

  // Initialize store
  useEffect(() => {
    if (editMode && existingResponses.length > 0) {
      // Pre-fill from existing responses in edit mode
      init(
        inspection.id,
        space.id,
        items.map((i) => i.id)
      );
      // Set existing results
      for (const resp of existingResponses) {
        if (resp.result) {
          setResult(resp.checklist_item_id, resp.result as "pass" | "fail");
        }
        if (resp.comment) {
          setComment(resp.checklist_item_id, resp.comment);
        }
      }
    } else {
      const loaded = loadFromStorage(space.id);
      if (!loaded) {
        init(
          inspection.id,
          space.id,
          items.map((i) => i.id)
        );
      }
    }
  }, []);

  // Timer (only for new inspections)
  useEffect(() => {
    if (editMode) return;
    const start = new Date(inspection.started_at).getTime();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [inspection.started_at, editMode]);

  // Auto-save to Supabase with 3s debounce
  const syncToSupabase = useCallback(async () => {
    if (!isDirty) return;

    const supabase = createBrowserSupabaseClient();
    const responseEntries = Object.values(responses);

    for (const resp of responseEntries) {
      if (resp.result === null) continue;

      await supabase.from("inspection_responses").upsert(
        {
          inspection_id: inspection.id,
          checklist_item_id: resp.checklistItemId,
          result: resp.result,
          comment: resp.comment || null,
        },
        { onConflict: "inspection_id,checklist_item_id" }
      );
    }

    markClean();
  }, [isDirty, responses, inspection.id, markClean]);

  useEffect(() => {
    if (!isDirty) return;

    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(syncToSupabase, 3000);

    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, [isDirty, syncToSupabase]);

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  function handlePhotoClick(itemId: string) {
    activePhotoItemRef.current = itemId;
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const itemId = activePhotoItemRef.current;
    if (!file || !itemId) return;

    e.target.value = "";
    setUploadingItem(itemId);

    try {
      const compressed = await compressPhoto(file);
      const supabase = createBrowserSupabaseClient();
      const resp = responses[itemId];
      const photoIndex = resp?.photoUrls.length ?? 0;

      const path = generatePhotoPath(
        orgId,
        buildingId,
        inspection.id,
        itemId,
        photoIndex
      );

      const { error: uploadError } = await supabase.storage
        .from("inspection-photos")
        .upload(path, compressed, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadError) {
        toast.error("Failed to upload photo");
        setUploadingItem(null);
        return;
      }

      addPhoto(itemId, path);
      toast.success("Photo uploaded");
    } catch {
      toast.error("Failed to process photo");
    }

    setUploadingItem(null);
  }

  async function handleSubmit() {
    // Validate all items have results
    const unanswered = items.filter((item) => {
      const resp = responses[item.id];
      return !resp || resp.result === null;
    });

    if (unanswered.length > 0) {
      toast.error(
        `${unanswered.length} item${unanswered.length !== 1 ? "s" : ""} not answered`
      );
      return;
    }

    setSubmitting(true);
    const supabase = createBrowserSupabaseClient();

    try {
      if (editMode) {
        // EDIT MODE: Update existing responses, skip deficiency/task creation
        for (const item of items) {
          const resp = responses[item.id];
          if (!resp) continue;

          await supabase
            .from("inspection_responses")
            .upsert(
              {
                inspection_id: inspection.id,
                checklist_item_id: item.id,
                result: resp.result,
                comment: resp.comment || null,
              },
              { onConflict: "inspection_id,checklist_item_id" }
            );
        }

        reset();
        toast.success("Inspection updated");
        router.push(`/inspect/${space.id}`);
        router.refresh();
        return;
      }

      // NEW INSPECTION MODE
      // 1. Upsert all responses
      for (const item of items) {
        const resp = responses[item.id];
        if (!resp) continue;

        const { data: respData, error: respError } = await supabase
          .from("inspection_responses")
          .upsert(
            {
              inspection_id: inspection.id,
              checklist_item_id: item.id,
              result: resp.result,
              comment: resp.comment || null,
            },
            { onConflict: "inspection_id,checklist_item_id" }
          )
          .select("id")
          .single();

        if (respError || !respData) continue;

        const responseId = (respData as unknown as { id: string }).id;

        // Insert photo records
        for (let i = 0; i < resp.photoUrls.length; i++) {
          await supabase.from("response_photos").insert({
            response_id: responseId,
            photo_url: resp.photoUrls[i],
            display_order: i,
          });
        }

        // 2. Create deficiency + task for failed items
        if (resp.result === "fail") {
          // Generate deficiency number
          const { count } = await supabase
            .from("deficiencies")
            .select("*", { count: "exact", head: true })
            .eq("space_id", space.id);

          const defNum = `DEF-${String((count ?? 0) + 1).padStart(4, "0")}`;

          const { data: defData, error: defError } = await supabase
            .from("deficiencies")
            .insert({
              space_id: space.id,
              inspection_id: inspection.id,
              response_id: responseId,
              deficiency_number: defNum,
            })
            .select("id")
            .single();

          if (!defError && defData) {
            const defId = (defData as unknown as { id: string }).id;

            // Auto-create task
            await supabase.from("tasks").insert({
              deficiency_id: defId,
              space_id: space.id,
              created_by: userId,
              description: `${item.description} — ${resp.comment || "Failed inspection"}`,
              source: "auto",
            });
          }
        }
      }

      // 3. Mark inspection as completed
      const { error: completeError } = await supabase
        .from("inspections")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", inspection.id);

      if (completeError) {
        toast.error("Failed to complete inspection");
        setSubmitting(false);
        return;
      }

      // 4. Clear local storage
      reset();

      toast.success("Inspection submitted");

      // Fire-and-forget: check if all spaces inspected for completion trigger
      fetch("/api/webhooks/inspection-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ building_id: buildingId }),
      }).catch(() => {});

      router.push(`/inspect/${space.id}`);
      router.refresh();
    } catch {
      toast.error("Failed to submit inspection");
      setSubmitting(false);
    }
  }

  // Group items by category
  const grouped = items.reduce<Record<string, ChecklistItem[]>>((acc, item) => {
    const key = item.category || "General";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const groupKeys = Object.keys(grouped).sort((a, b) => {
    if (a === "General") return 1;
    if (b === "General") return -1;
    return a.localeCompare(b);
  });

  const answeredCount = Object.values(responses).filter(
    (r) => r.result !== null
  ).length;
  const progress = items.length > 0 ? (answeredCount / items.length) * 100 : 0;

  return (
    <div className="pb-28">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Sticky header */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <Link
            href={`/inspect/${space.id}`}
            className="flex items-center gap-1 text-sm-body text-slate-500"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-400" />
            <span className="font-mono text-caption text-slate-500">
              {formatTime(elapsed)}
            </span>
          </div>
        </div>
        <div className="mt-2">
          <div className="flex items-center justify-between">
            <h1 className="text-h3 text-slate-900">{space.name}</h1>
            <span className="text-caption text-slate-500">
              {answeredCount}/{items.length}
            </span>
          </div>
          <p className="text-caption text-slate-400">
            {floorName} · {buildingName}
          </p>
          {/* Progress bar */}
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-primary-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Checklist items */}
      <div className="p-4 space-y-6">
        {groupKeys.map((groupName) => (
          <div key={groupName}>
            <h3 className="text-label mb-3 uppercase text-slate-500">
              {groupName}
            </h3>
            <div className="space-y-3">
              {grouped[groupName].map((item) => {
                const resp = responses[item.id];
                const result = resp?.result ?? null;

                return (
                  <div
                    key={item.id}
                    className="rounded-lg border border-slate-200 bg-white shadow-sm"
                  >
                    <div className="flex items-start gap-3 px-4 py-3">
                      <span className="mt-0.5 w-6 shrink-0 text-center font-mono text-caption text-slate-400">
                        {item.display_order + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-body text-slate-700">
                          {item.description}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => setResult(item.id, "pass")}
                          className={`flex h-9 w-9 items-center justify-center rounded-md border-2 transition-colors ${
                            result === "pass"
                              ? "border-pass bg-pass-bg text-pass"
                              : "border-slate-200 text-slate-300 hover:border-pass hover:text-pass"
                          }`}
                        >
                          <CheckCircle2 className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setResult(item.id, "fail")}
                          className={`flex h-9 w-9 items-center justify-center rounded-md border-2 transition-colors ${
                            result === "fail"
                              ? "border-fail bg-fail-bg text-fail"
                              : "border-slate-200 text-slate-300 hover:border-fail hover:text-fail"
                          }`}
                        >
                          <XCircle className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    {/* Fail panel: comment + photo */}
                    {result === "fail" && (
                      <div className="border-t border-slate-100 bg-fail-bg px-4 py-3 rounded-b-lg">
                        <Input
                          placeholder="Add comment..."
                          value={resp?.comment ?? ""}
                          onChange={(e) =>
                            setComment(item.id, e.target.value)
                          }
                          className="mb-2 border-fail-border bg-white text-sm"
                        />

                        {/* Photos */}
                        <div className="flex flex-wrap gap-2">
                          {(resp?.photoUrls ?? []).map((url, idx) => (
                            <div
                              key={idx}
                              className="relative h-16 w-16 overflow-hidden rounded-md border border-fail-border"
                            >
                              <div className="flex h-full w-full items-center justify-center bg-slate-100">
                                <Camera className="h-4 w-4 text-slate-400" />
                              </div>
                              <button
                                type="button"
                                onClick={() => removePhoto(item.id, url)}
                                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-fail text-white"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => handlePhotoClick(item.id)}
                            disabled={uploadingItem === item.id}
                            className="flex h-16 w-16 items-center justify-center rounded-md border-2 border-dashed border-fail-border bg-white text-fail transition-colors hover:bg-fail-bg"
                          >
                            {uploadingItem === item.id ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              <Camera className="h-5 w-5" />
                            )}
                          </button>
                        </div>

                        {item.photo_required && (resp?.photoUrls ?? []).length === 0 && (
                          <p className="mt-1 text-[11px] text-fail">
                            Photo required for this item
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Submit button - sticky bottom */}
      <div className="fixed bottom-16 left-0 right-0 border-t border-slate-200 bg-white px-4 py-3 shadow-lg">
        <Button
          onClick={handleSubmit}
          disabled={submitting || answeredCount < items.length}
          className="w-full bg-primary-600 font-semibold text-white hover:bg-primary-700"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {editMode ? "Saving..." : "Submitting..."}
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              {editMode
                ? `Save Changes (${answeredCount}/${items.length})`
                : `Submit Inspection (${answeredCount}/${items.length})`}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
