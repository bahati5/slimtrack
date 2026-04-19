"use client";

import { compressImage, getCompressPreset } from "@/lib/image/compress";

export interface SignedUploadParams {
  kind: "meal" | "activity" | "avatar" | "progress";
  date?: string;
}

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  resource_type: string;
  width?: number;
  height?: number;
  format?: string;
  duration?: number;
}

export async function uploadToCloudinary(
  file: File,
  params: SignedUploadParams,
  onProgress?: (pct: number) => void,
): Promise<CloudinaryUploadResult> {
  onProgress?.(0);

  const compressed = await compressImage(
    file,
    getCompressPreset(params.kind),
  );

  const signRes = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!signRes.ok) throw new Error("Signature Cloudinary refusée");
  const { signature, timestamp, apiKey, cloudName, folder, transformation } =
    await signRes.json();

  const form = new FormData();
  form.append("file", compressed);
  form.append("api_key", apiKey);
  form.append("timestamp", String(timestamp));
  form.append("signature", signature);
  form.append("folder", folder);
  if (transformation) form.append("transformation", transformation);

  const isVideo = compressed.type.startsWith("video/");
  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/${isVideo ? "video" : "image"}/upload`;

  return new Promise<CloudinaryUploadResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress)
        onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch (err) {
          reject(err);
        }
      } else reject(new Error(`Cloudinary upload failed: ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error("Erreur réseau Cloudinary"));
    xhr.send(form);
  });
}
