"use client";

import { useState } from "react";
import Image from "next/image";
import { Camera, Loader2, X } from "lucide-react";
import {
  uploadToCloudinary,
  type SignedUploadParams,
} from "@/lib/cloudinary/client-upload";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils/cn";

interface MediaUploaderProps {
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
  kind: SignedUploadParams["kind"];
  date?: string;
  accept?: string;
  className?: string;
}

export function MediaUploader({
  value,
  onChange,
  max = 3,
  kind,
  date,
  accept = "image/*,video/*",
  className,
}: MediaUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const toast = useToast();

  async function handleFiles(files: FileList | null) {
    if (!files || !files.length) return;
    if (value.length >= max) {
      toast.warning(`Max ${max} médias`);
      return;
    }
    setUploading(true);
    try {
      const file = files[0];
      const result = await uploadToCloudinary(file, { kind, date }, (p) =>
        setProgress(p),
      );
      onChange([...value, result.secure_url]);
    } catch (err) {
      console.error(err);
      toast.error("Upload impossible");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap gap-2">
        {value.map((url) => (
          <div
            key={url}
            className="relative size-20 overflow-hidden rounded-2xl border border-[var(--color-border)]"
          >
            <Image src={url} alt="" fill className="object-cover" sizes="80px" />
            <button
              type="button"
              onClick={() => onChange(value.filter((u) => u !== url))}
              className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
              aria-label="Retirer"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}
        {value.length < max && (
          <label className="relative flex size-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-card-soft)] text-xs text-[var(--color-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary-soft)]">
            {uploading ? (
              <>
                <Loader2 className="size-5 animate-spin" />
                <span>{progress}%</span>
              </>
            ) : (
              <>
                <Camera className="size-5" />
                <span>Photo</span>
              </>
            )}
            <input
              type="file"
              accept={accept}
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={(e) => handleFiles(e.target.files)}
              disabled={uploading}
            />
          </label>
        )}
      </div>
    </div>
  );
}
