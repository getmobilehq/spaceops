"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Printer } from "lucide-react";
import { toast } from "sonner";

interface BatchPrintButtonProps {
  buildingId: string;
  spaceCount: number;
}

interface QrCodeData {
  spaceId: string;
  spaceName: string;
  floorName: string;
  dataUrl: string;
}

export function BatchPrintButton({
  buildingId,
  spaceCount,
}: BatchPrintButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handlePrint() {
    if (spaceCount === 0) {
      toast.error("No spaces to print");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/qr-batch?buildingId=${buildingId}`);
      if (!res.ok) throw new Error("Failed to fetch QR codes");

      const { qrCodes } = (await res.json()) as { qrCodes: QrCodeData[] };

      // Open print window with QR grid
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("Please allow popups to print QR codes");
        setLoading(false);
        return;
      }

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>QR Codes</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'DM Sans', system-ui, sans-serif; }
            .grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 16px;
              padding: 24px;
            }
            .card {
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 16px;
              text-align: center;
              page-break-inside: avoid;
            }
            .card img { width: 160px; height: 160px; }
            .card .name {
              font-size: 13px;
              font-weight: 600;
              color: #111827;
              margin-top: 8px;
            }
            .card .floor {
              font-size: 11px;
              color: #64748b;
              margin-top: 2px;
            }
            @media print {
              .grid { padding: 12px; gap: 8px; }
              .card { padding: 8px; }
              .card img { width: 120px; height: 120px; }
            }
          </style>
        </head>
        <body>
          <div class="grid">
            ${qrCodes
              .map(
                (qr) => `
              <div class="card">
                <img src="${qr.dataUrl}" alt="${qr.spaceName}" />
                <div class="name">${qr.spaceName}</div>
                <div class="floor">${qr.floorName}</div>
              </div>
            `
              )
              .join("")}
          </div>
          <script>window.onload = () => window.print();</script>
        </body>
        </html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();
    } catch {
      toast.error("Failed to generate QR codes");
    }

    setLoading(false);
  }

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={loading || spaceCount === 0}
      onClick={handlePrint}
    >
      {loading ? (
        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
      ) : (
        <Printer className="mr-1.5 h-4 w-4" />
      )}
      Print QR Codes
    </Button>
  );
}
