const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1920;
const MAX_SIZE_BYTES = 1_000_000; // 1MB
const INITIAL_QUALITY = 0.8;

export async function compressPhoto(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Scale down if too large
      if (width > MAX_WIDTH || height > MAX_HEIGHT) {
        const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context not available"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Try progressive quality reduction
      let quality = INITIAL_QUALITY;

      function tryCompress() {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Compression failed"));
              return;
            }

            if (blob.size <= MAX_SIZE_BYTES || quality <= 0.3) {
              resolve(blob);
            } else {
              quality -= 0.1;
              tryCompress();
            }
          },
          "image/jpeg",
          quality
        );
      }

      tryCompress();
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}

export function generatePhotoPath(
  orgId: string,
  buildingId: string,
  inspectionId: string,
  itemId: string,
  index: number
): string {
  return `${orgId}/${buildingId}/inspections/${inspectionId}/${itemId}_${index}.jpg`;
}

/**
 * Generate signed URLs for an array of photo storage paths (client-side).
 * Uses batch createSignedUrls for a single HTTP call. 10-minute expiry.
 */
export async function getSignedPhotoUrls(
  paths: string[]
): Promise<Record<string, string>> {
  if (paths.length === 0) return {};

  const { createBrowserSupabaseClient } = await import(
    "@/lib/supabase/client"
  );
  const supabase = createBrowserSupabaseClient();
  const result: Record<string, string> = {};

  const { data } = await supabase.storage
    .from("inspection-photos")
    .createSignedUrls(paths, 600);

  if (!data) return result;

  for (let i = 0; i < data.length; i++) {
    if (data[i].signedUrl && !data[i].error) {
      result[paths[i]] = data[i].signedUrl;
    }
  }

  return result;
}

/**
 * Server-side signed URL generation. Pass a Supabase client instance.
 */
export async function getSignedPhotoUrlsServer(
  paths: string[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
): Promise<Record<string, string>> {
  if (paths.length === 0) return {};

  const result: Record<string, string> = {};

  const { data } = await supabase.storage
    .from("inspection-photos")
    .createSignedUrls(paths, 600);

  if (!data) return result;

  for (let i = 0; i < data.length; i++) {
    if (data[i].signedUrl && !data[i].error) {
      result[paths[i]] = data[i].signedUrl;
    }
  }

  return result;
}
