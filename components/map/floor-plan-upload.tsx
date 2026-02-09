"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Loader2, AlertCircle } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { renderPdfToBlob } from "@/lib/utils/pdf-renderer";
import { toast } from "sonner";

interface FloorPlanUploadProps {
  floorId: string;
  buildingId: string;
  orgId: string;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export function FloorPlanUpload({
  floorId,
  buildingId,
  orgId,
}: FloorPlanUploadProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  async function handleFile(file: File) {
    if (file.type !== "application/pdf") {
      toast.error("Please select a PDF file");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File too large (max 20MB)");
      return;
    }

    setLoading(true);
    const supabase = createBrowserSupabaseClient();

    try {
      // Render PDF to PNG
      setStatus("Rendering floor plan...");
      const { blob, width, height } = await renderPdfToBlob(file);

      // Upload original PDF
      setStatus("Uploading PDF...");
      const pdfPath = `${orgId}/${buildingId}/floors/${floorId}/original.pdf`;
      await supabase.storage
        .from("floor-plans")
        .upload(pdfPath, file, { contentType: "application/pdf", upsert: true });

      // Upload rendered PNG
      setStatus("Uploading rendered image...");
      const pngPath = `${orgId}/${buildingId}/floors/${floorId}/rendered.png`;
      await supabase.storage
        .from("floor-plans")
        .upload(pngPath, blob, { contentType: "image/png", upsert: true });

      // Upsert floor_plans record
      setStatus("Saving...");

      // Check if floor plan exists
      const { data: existing } = await supabase
        .from("floor_plans")
        .select("id")
        .eq("floor_id", floorId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("floor_plans")
          .update({
            original_pdf_url: pdfPath,
            rendered_image_url: pngPath,
            image_width: width,
            image_height: height,
          })
          .eq("floor_id", floorId);
      } else {
        await supabase.from("floor_plans").insert({
          floor_id: floorId,
          original_pdf_url: pdfPath,
          rendered_image_url: pngPath,
          image_width: width,
          image_height: height,
        });
      }

      toast.success("Floor plan uploaded");
      router.refresh();
    } catch {
      toast.error("Failed to process floor plan");
    }

    setLoading(false);
    setStatus("");
  }

  return (
    <div className="flex flex-col items-center gap-4 p-8">
      <input
        ref={fileRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      <div
        className="w-full max-w-sm cursor-pointer rounded-lg border-2 border-dashed border-slate-300 bg-white p-12 text-center transition-colors hover:border-primary-400 hover:bg-primary-50"
        onClick={() => !loading && fileRef.current?.click()}
      >
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
            <p className="text-body text-slate-600">{status}</p>
          </div>
        ) : (
          <>
            <Upload className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-3 text-body font-medium text-slate-700">
              Upload Floor Plan
            </p>
            <p className="mt-1 text-caption text-slate-400">
              PDF file, max 20MB
            </p>
          </>
        )}
      </div>
    </div>
  );
}
