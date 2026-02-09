"use client";

import { useState } from "react";
import { Share2, Copy, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface ShareDashboardButtonProps {
  buildingId: string;
}

export function ShareDashboardButton({ buildingId }: ShareDashboardButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function generateLink() {
    setLoading(true);
    const supabase = createBrowserSupabaseClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Not authenticated");
      setLoading(false);
      return;
    }

    // Generate random token
    const token = crypto.randomUUID().replace(/-/g, "");

    const { error } = await supabase.from("shared_dashboards").insert({
      building_id: buildingId,
      token,
      created_by: user.id,
    });

    setLoading(false);

    if (error) {
      toast.error("Failed to generate share link");
      return;
    }

    const url = `${window.location.origin}/share/${token}`;
    setShareUrl(url);
  }

  async function copyLink() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-slate-400 hover:text-slate-600"
        onClick={() => {
          setOpen(true);
          setShareUrl(null);
          setCopied(false);
        }}
      >
        <Share2 className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Dashboard</DialogTitle>
          </DialogHeader>
          <p className="text-body text-slate-600">
            Generate a public link that anyone can use to view this
            building&apos;s dashboard without signing in.
          </p>

          {shareUrl ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <code className="min-w-0 flex-1 truncate font-mono text-caption text-slate-700">
                  {shareUrl}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyLink}
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-pass" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={generateLink}
                disabled={loading}
              >
                Generate New Link
              </Button>
            </div>
          ) : (
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={generateLink}
                disabled={loading}
                className="bg-primary-600 font-semibold text-white hover:bg-primary-700"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate Link
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
