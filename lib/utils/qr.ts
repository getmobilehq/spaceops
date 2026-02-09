import QRCode from "qrcode";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export function getSpaceInspectUrl(spaceId: string): string {
  return `${APP_URL}/inspect/${spaceId}`;
}

export async function generateQrSvg(spaceId: string): Promise<string> {
  const url = getSpaceInspectUrl(spaceId);
  return QRCode.toString(url, {
    type: "svg",
    margin: 1,
    width: 256,
    color: { dark: "#111827", light: "#FFFFFF" },
  });
}

export async function generateQrDataUrl(spaceId: string): Promise<string> {
  const url = getSpaceInspectUrl(spaceId);
  return QRCode.toDataURL(url, {
    margin: 1,
    width: 256,
    color: { dark: "#111827", light: "#FFFFFF" },
  });
}
