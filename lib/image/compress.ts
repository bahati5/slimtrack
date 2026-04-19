"use client";

export interface CompressOptions {
  maxWidth: number;
  maxHeight: number;
  quality: number;
}

const PRESETS: Record<string, CompressOptions> = {
  meal: { maxWidth: 1200, maxHeight: 1200, quality: 0.7 },
  activity: { maxWidth: 1200, maxHeight: 1200, quality: 0.7 },
  avatar: { maxWidth: 400, maxHeight: 400, quality: 0.8 },
  progress: { maxWidth: 1200, maxHeight: 1200, quality: 0.7 },
};

export function getCompressPreset(kind: string): CompressOptions {
  return PRESETS[kind] ?? PRESETS.meal;
}

function supportsWebP(): boolean {
  if (typeof document === "undefined") return false;
  const c = document.createElement("canvas");
  c.width = 1;
  c.height = 1;
  return c.toDataURL("image/webp").startsWith("data:image/webp");
}

let _webp: boolean | null = null;
function canUseWebP() {
  if (_webp === null) _webp = supportsWebP();
  return _webp;
}

/**
 * Compress an image file client-side using Canvas.
 * Returns a new File with reduced size (WebP if supported, else JPEG).
 * Videos are returned as-is.
 */
export async function compressImage(
  file: File,
  opts: CompressOptions,
): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (file.type === "image/gif" || file.type === "image/svg+xml") return file;

  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;

  let targetW = width;
  let targetH = height;
  const ratio = width / height;

  if (targetW > opts.maxWidth) {
    targetW = opts.maxWidth;
    targetH = Math.round(targetW / ratio);
  }
  if (targetH > opts.maxHeight) {
    targetH = opts.maxHeight;
    targetW = Math.round(targetH * ratio);
  }

  const alreadySmall =
    file.size < 200_000 && targetW === width && targetH === height;
  if (alreadySmall) {
    bitmap.close();
    return file;
  }

  const canvas = new OffscreenCanvas(targetW, targetH);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  bitmap.close();

  const outputType = canUseWebP() ? "image/webp" : "image/jpeg";
  const ext = canUseWebP() ? "webp" : "jpg";
  const blob = await canvas.convertToBlob({
    type: outputType,
    quality: opts.quality,
  });

  return new File([blob], file.name.replace(/\.\w+$/, `.${ext}`), {
    type: outputType,
    lastModified: Date.now(),
  });
}
