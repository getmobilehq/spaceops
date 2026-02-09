"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Upload, FileText, AlertCircle } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Floor, SpaceType } from "@/lib/types/helpers";

interface CsvImportDialogProps {
  open: boolean;
  onClose: () => void;
  floors: Floor[];
  spaceTypes: SpaceType[];
}

interface ParsedRow {
  name: string;
  spaceType?: string;
}

export function CsvImportDialog({
  open,
  onClose,
  floors,
  spaceTypes,
}: CsvImportDialogProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [floorId, setFloorId] = useState(floors[0]?.id ?? "");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");

  const spaceTypeNameMap = Object.fromEntries(
    spaceTypes.map((t) => [t.name.toLowerCase(), t.id])
  );

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      // Check for header row
      const firstLine = lines[0]?.toLowerCase();
      const hasHeader =
        firstLine?.includes("name") || firstLine?.includes("space");
      const dataLines = hasHeader ? lines.slice(1) : lines;

      if (dataLines.length > 500) {
        setErrors(["Maximum 500 spaces per import"]);
        setRows([]);
        return;
      }

      const parsed: ParsedRow[] = [];
      const parseErrors: string[] = [];

      dataLines.forEach((line, idx) => {
        const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        const name = cols[0];

        if (!name || name.length < 1) {
          parseErrors.push(`Row ${idx + 1}: Missing name`);
          return;
        }

        parsed.push({
          name,
          spaceType: cols[1] || undefined,
        });
      });

      setRows(parsed);
      setErrors(parseErrors);
    };

    reader.readAsText(file);
  }

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();

    if (!floorId) {
      toast.error("Please select a floor");
      return;
    }

    if (rows.length === 0) {
      toast.error("No valid rows to import");
      return;
    }

    setLoading(true);
    const supabase = createBrowserSupabaseClient();

    const insertData = rows.map((row) => ({
      floor_id: floorId,
      name: row.name,
      space_type_id: row.spaceType
        ? spaceTypeNameMap[row.spaceType.toLowerCase()] || null
        : null,
    }));

    const { data: spacesData, error } = await supabase
      .from("spaces")
      .insert(insertData)
      .select("id");

    if (error) {
      setLoading(false);
      toast.error("Failed to import spaces");
      return;
    }

    // Auto-generate QR codes for all new spaces
    const spaces = (spacesData ?? []) as unknown as { id: string }[];
    if (spaces.length > 0) {
      const qrInserts = spaces.map((s) => ({
        space_id: s.id,
        encoded_url: `${window.location.origin}/inspect/${s.id}`,
      }));

      await supabase.from("qr_codes").insert(qrInserts);
    }

    setLoading(false);
    toast.success(`Imported ${rows.length} spaces`);
    setRows([]);
    setErrors([]);
    setFileName("");
    onClose();
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setRows([]);
          setErrors([]);
          setFileName("");
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Spaces from CSV</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleImport} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm-body font-semibold text-slate-700">
              Floor
            </Label>
            <Select value={floorId} onValueChange={setFloorId}>
              <SelectTrigger>
                <SelectValue placeholder="Select floor" />
              </SelectTrigger>
              <SelectContent>
                {floors.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm-body font-semibold text-slate-700">
              CSV File
            </Label>
            <div
              className="cursor-pointer rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center transition-colors hover:border-primary-400 hover:bg-primary-50"
              onClick={() => fileRef.current?.click()}
            >
              {fileName ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText className="h-5 w-5 text-primary-500" />
                  <span className="text-body text-slate-700">{fileName}</span>
                </div>
              ) : (
                <>
                  <Upload className="mx-auto h-6 w-6 text-slate-400" />
                  <p className="mt-2 text-sm-body text-slate-500">
                    Click to select CSV file
                  </p>
                </>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
            <p className="text-caption text-slate-400">
              Format: name, space_type (optional). Max 500 rows.
            </p>
          </div>

          {errors.length > 0 && (
            <div className="rounded-lg bg-fail-bg p-3">
              <div className="flex items-center gap-2 text-fail">
                <AlertCircle className="h-4 w-4" />
                <span className="text-caption font-semibold">
                  {errors.length} error{errors.length !== 1 ? "s" : ""}
                </span>
              </div>
              <ul className="mt-1 space-y-0.5">
                {errors.slice(0, 5).map((err, i) => (
                  <li key={i} className="text-caption text-slate-600">
                    {err}
                  </li>
                ))}
                {errors.length > 5 && (
                  <li className="text-caption text-slate-400">
                    ...and {errors.length - 5} more
                  </li>
                )}
              </ul>
            </div>
          )}

          {rows.length > 0 && (
            <div className="rounded-lg bg-pass-bg p-3">
              <p className="text-caption font-semibold text-pass">
                {rows.length} space{rows.length !== 1 ? "s" : ""} ready to
                import
              </p>
              <ul className="mt-1 space-y-0.5">
                {rows.slice(0, 5).map((row, i) => (
                  <li key={i} className="text-caption text-slate-600">
                    {row.name}
                    {row.spaceType ? ` (${row.spaceType})` : ""}
                  </li>
                ))}
                {rows.length > 5 && (
                  <li className="text-caption text-slate-400">
                    ...and {rows.length - 5} more
                  </li>
                )}
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || rows.length === 0}
              className="bg-primary-600 font-semibold text-white hover:bg-primary-700"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Import {rows.length > 0 ? `${rows.length} Spaces` : ""}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
