"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Space } from "@/lib/types/helpers";

interface SpaceQrDialogProps {
  space: Space | null;
  buildingName: string;
  floorName: string;
  onClose: () => void;
}

export function SpaceQrDialog({
  space,
  floorName,
  onClose,
}: SpaceQrDialogProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!space) {
      setQrDataUrl(null);
      return;
    }

    setLoading(true);
    // Dynamic import to avoid SSR issues with qrcode
    import("qrcode").then((QRCode) => {
      const url = `${window.location.origin}/inspect/${space.id}`;
      QRCode.toDataURL(url, {
        margin: 1,
        width: 256,
        color: { dark: "#111827", light: "#FFFFFF" },
      }).then((dataUrl) => {
        setQrDataUrl(dataUrl);
        setLoading(false);
      });
    });
  }, [space]);

  function handleDownload() {
    if (!qrDataUrl || !space) return;

    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `qr-${space.name.toLowerCase().replace(/\s+/g, "-")}.png`;
    link.click();
  }

  function handleCopyLink() {
    if (!space) return;
    const url = `${window.location.origin}/inspect/${space.id}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  }

  return (
    <Dialog open={!!space} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>QR Code</DialogTitle>
        </DialogHeader>

        {space && (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-body font-medium text-slate-900">
                {space.name}
              </p>
              {floorName && (
                <p className="text-caption text-slate-500">{floorName}</p>
              )}
            </div>

            <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-white p-4">
              {loading ? (
                <div className="flex h-[256px] w-[256px] items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
                </div>
              ) : qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR code for ${space.name}`}
                  width={256}
                  height={256}
                />
              ) : null}
            </div>

            <p className="text-center text-caption text-slate-400 font-mono">
              {space.id.slice(0, 8)}...
            </p>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={handleCopyLink}
              >
                <Copy className="mr-1.5 h-4 w-4" />
                Copy Link
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-primary-600 font-semibold text-white hover:bg-primary-700"
                onClick={handleDownload}
              >
                <Download className="mr-1.5 h-4 w-4" />
                Download PNG
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
