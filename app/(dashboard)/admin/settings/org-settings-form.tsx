"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Check } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { createOrgSchema } from "@/lib/validators/schemas";
import { toast } from "sonner";
import type { Organization } from "@/lib/types/helpers";

interface OrgSettingsFormProps {
  org: Organization;
}

export function OrgSettingsForm({ org }: OrgSettingsFormProps) {
  const router = useRouter();
  const [name, setName] = useState(org.name);
  const [contactEmail, setContactEmail] = useState(org.contact_email || "");
  const [brandColor, setBrandColor] = useState(org.brand_color || "#0E8585");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const parsed = createOrgSchema.safeParse({
      name,
      contact_email: contactEmail,
      brand_color: brandColor,
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setLoading(true);
    const supabase = createBrowserSupabaseClient();

    const { error } = await supabase
      .from("organizations")
      .update({
        name,
        contact_email: contactEmail || null,
        brand_color: brandColor,
      })
      .eq("id", org.id);

    setLoading(false);

    if (error) {
      toast.error("Failed to update organization");
      return;
    }

    toast.success("Organization updated");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm-body font-semibold text-slate-700">
              Organization Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm-body font-semibold text-slate-700">
              Contact Email
            </Label>
            <Input
              id="email"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="contact@company.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="color" className="text-sm-body font-semibold text-slate-700">
              Brand Color
            </Label>
            <div className="flex items-center gap-3">
              <input
                id="color"
                type="color"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="h-10 w-10 cursor-pointer rounded border border-slate-200"
              />
              <Input
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                placeholder="#0E8585"
                className="max-w-32 font-mono"
              />
            </div>
          </div>
        </div>
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="bg-primary-600 font-semibold text-white hover:bg-primary-700"
      >
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Check className="mr-2 h-4 w-4" />
        )}
        Save Changes
      </Button>
    </form>
  );
}
