"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface ArchiveBuildingButtonProps {
  buildingId: string;
}

export function ArchiveBuildingButton({ buildingId }: ArchiveBuildingButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleArchive() {
    setLoading(true);
    const supabase = createBrowserSupabaseClient();

    const { error } = await supabase
      .from("buildings")
      .update({ archived: true })
      .eq("id", buildingId);

    setLoading(false);

    if (error) {
      toast.error("Failed to archive building");
      return;
    }

    toast.success("Building archived");
    setOpen(false);
    router.push("/buildings");
    router.refresh();
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-slate-400 hover:text-slate-600"
        onClick={() => setOpen(true)}
      >
        <Archive className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Archive Building</DialogTitle>
          </DialogHeader>
          <p className="text-body text-slate-600">
            This building will be hidden from active views but all data is
            preserved. You can restore it from the buildings list.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleArchive}
              disabled={loading}
              className="bg-warning font-semibold text-white hover:bg-amber-600"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Archive
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
