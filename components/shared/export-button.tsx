"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ExportButtonProps {
  exportType: "tasks" | "deficiencies" | "inspections";
  filters?: Record<string, string | undefined>;
  disabled?: boolean;
}

export function ExportButton({ exportType, filters = {}, disabled }: ExportButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);

    try {
      const cleanFilters: Record<string, string> = {};
      for (const [key, value] of Object.entries(filters)) {
        if (value && value !== "all") {
          cleanFilters[key] = value;
        }
      }

      const res = await fetch(`/api/export/${exportType}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanFilters),
      });

      if (!res.ok) {
        throw new Error("Export failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.headers.get("Content-Disposition")?.split("filename=")[1]?.replace(/"/g, "") || `export.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Export downloaded");
    } catch {
      toast.error("Failed to export data");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={loading || disabled}
    >
      {loading ? (
        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
      ) : (
        <Download className="mr-1.5 h-3.5 w-3.5" />
      )}
      Export CSV
    </Button>
  );
}
