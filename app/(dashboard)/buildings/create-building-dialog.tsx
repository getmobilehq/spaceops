"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Loader2 } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { createBuildingSchema } from "@/lib/validators/schemas";
import { toast } from "sonner";

interface CreateBuildingDialogProps {
  orgId: string;
}

export function CreateBuildingDialog({ orgId }: CreateBuildingDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [sqft, setSqft] = useState("");

  function resetForm() {
    setName("");
    setStreet("");
    setCity("");
    setState("");
    setZip("");
    setSqft("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const parsed = createBuildingSchema.safeParse({
      name,
      street,
      city,
      state,
      zip,
      sqft: sqft || undefined,
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setLoading(true);
    const supabase = createBrowserSupabaseClient();

    const { error } = await supabase.from("buildings").insert({
      org_id: orgId,
      name,
      street: street || null,
      city: city || null,
      state: state || null,
      zip: zip || null,
      sqft: sqft ? parseInt(sqft) : null,
    });

    setLoading(false);

    if (error) {
      if (error.code === "23505") {
        toast.error("A building with this name already exists");
      } else {
        toast.error("Failed to create building");
      }
      return;
    }

    toast.success("Building created");
    resetForm();
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="bg-primary-600 font-semibold text-white hover:bg-primary-700"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Add Building
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Building</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bld-name" className="text-sm-body font-semibold text-slate-700">
              Building Name *
            </Label>
            <Input
              id="bld-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Main Office"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm-body font-semibold text-slate-700">
              Address
            </Label>
            <Input
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              placeholder="Street address"
            />
            <div className="grid grid-cols-3 gap-2">
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                className="col-span-1"
              />
              <Input
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="State"
              />
              <Input
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder="ZIP"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sqft" className="text-sm-body font-semibold text-slate-700">
              Square Footage
            </Label>
            <Input
              id="sqft"
              type="number"
              value={sqft}
              onChange={(e) => setSqft(e.target.value)}
              placeholder="10000"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-primary-600 font-semibold text-white hover:bg-primary-700"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Building
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
