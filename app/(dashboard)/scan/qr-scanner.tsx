"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Camera, AlertCircle, ScanLine } from "lucide-react";
import { toast } from "sonner";

export function QrScanner() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCamera, setHasCamera] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setScanning(false);
  }

  async function startCamera() {
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setScanning(true);

      // Use BarcodeDetector API if available
      if ("BarcodeDetector" in window) {
        const detector = new (window as unknown as { BarcodeDetector: new (opts: { formats: string[] }) => { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> } }).BarcodeDetector({
          formats: ["qr_code"],
        });

        scanIntervalRef.current = setInterval(async () => {
          if (!videoRef.current) return;

          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const value = barcodes[0].rawValue;
              handleQrResult(value);
            }
          } catch {}
        }, 500);
      } else {
        // Fallback: prompt user to use native camera
        setError(
          "QR scanning is not supported in this browser. Please use your device's native camera app to scan QR codes."
        );
        stopCamera();
      }
    } catch {
      setHasCamera(false);
      setError("Camera access denied. Please enable camera permissions.");
    }
  }

  function handleQrResult(value: string) {
    stopCamera();

    // Extract space ID from URL
    const match = value.match(/\/inspect\/([a-f0-9-]+)/);
    if (match) {
      toast.success("QR code scanned!");
      router.push(`/inspect/${match[1]}`);
    } else {
      toast.error("Invalid QR code — not a SpaceOps code");
      // Restart scanning
      startCamera();
    }
  }

  return (
    <div>
      {!scanning && !error && (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-slate-300 bg-white p-12">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-50">
            <ScanLine className="h-8 w-8 text-primary-500" />
          </div>
          <Button
            onClick={startCamera}
            className="bg-primary-600 font-semibold text-white hover:bg-primary-700"
          >
            <Camera className="mr-2 h-4 w-4" />
            Open Camera
          </Button>
        </div>
      )}

      {scanning && (
        <div className="relative overflow-hidden rounded-lg border border-slate-200">
          <video
            ref={videoRef}
            className="w-full rounded-lg"
            playsInline
            muted
          />
          {/* Scanning overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-48 w-48 rounded-lg border-2 border-primary-400" />
          </div>
          <div className="absolute bottom-4 left-0 right-0 text-center">
            <span className="rounded-full bg-black/50 px-3 py-1 text-caption text-white">
              Scanning...
            </span>
          </div>
          <canvas ref={canvasRef} className="hidden" />
          <Button
            variant="outline"
            size="sm"
            className="absolute right-3 top-3"
            onClick={stopCamera}
          >
            Cancel
          </Button>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-warning-bg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-warning" />
            <div>
              <p className="text-body text-slate-700">{error}</p>
              <p className="mt-2 text-caption text-slate-500">
                Tip: Most phones can scan QR codes directly from the camera app
                without needing this scanner.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
