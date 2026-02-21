"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { createBuildingSchema } from "@/lib/validators/schemas";
import { toast } from "sonner";
import type { Building } from "@/lib/types/helpers";

interface EditBuildingDialogProps {
  building: Building;
}

export function EditBuildingDialog({ building }: EditBuildingDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(building.name);
  const [street, setStreet] = useState(building.street ?? "");
  const [city, setCity] = useState(building.city ?? "");
  const [state, setState] = useState(building.state ?? "");
  const [zip, setZip] = useState(building.zip ?? "");
  const [sqft, setSqft] = useState(building.sqft?.toString() ?? "");

  function handleOpen() {
    setName(building.name);
    setStreet(building.street ?? "");
    setCity(building.city ?? "");
    setState(building.state ?? "");
    setZip(building.zip ?? "");
    setSqft(building.sqft?.toString() ?? "");
    setOpen(true);
  }

  async function handleSave() {
    const parsed = createBuildingSchema.safeParse({
      name,
      street: street || undefined,
      city: city || undefined,
      state: state || undefined,
      zip: zip || undefined,
      sqft: sqft ? Number(sqft) : undefined,
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setSaving(true);
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase
      .from("buildings")
      .update({
        name,
        street: street || null,
        city: city || null,
        state: state || null,
        zip: zip || null,
        sqft: sqft ? Number(sqft) : null,
      })
      .eq("id", building.id);

    setSaving(false);

    if (error) {
      if (error.code === "23505") {
        toast.error("A building with this name already exists");
      } else {
        toast.error("Failed to update building");
      }
      return;
    }

    toast.success("Building updated");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-slate-400 hover:text-slate-600"
        onClick={handleOpen}
      >
        <Pencil className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Building</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Building Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Main Office Tower"
                required
              />
            </div>
            <div>
              <Label>Street Address</Label>
              <Input
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="123 Main St"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>City</Label>
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                />
              </div>
              <div>
                <Label>State</Label>
                <Input
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="State"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>ZIP Code</Label>
                <Input
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  placeholder="12345"
                />
              </div>
              <div>
                <Label>Square Feet</Label>
                <Input
                  type="number"
                  value={sqft}
                  onChange={(e) => setSqft(e.target.value)}
                  placeholder="50000"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                )}
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
