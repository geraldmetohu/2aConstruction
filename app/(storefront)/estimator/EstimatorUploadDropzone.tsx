"use client";

import { UploadDropzone } from "@/app/lib/uploadthing";
import { normalizeUploadedFile } from "@/app/lib/uploaded-file";

type UploadedFile = {
  name: string;
  url: string;
  type?: string;
};

export function EstimatorUploadDropzone({
  onComplete,
  onError,
}: {
  onComplete: (files: UploadedFile[]) => void;
  onError: (message: string) => void;
}) {
  return (
    <UploadDropzone
      endpoint="estimatorUploader"
      onClientUploadComplete={(res) => {
        onError("");
        try { onComplete(res.map(normalizeUploadedFile)); }
        catch { onError("The uploaded file details could not be read. Please try again."); }
      }}
      onUploadError={(error) => {
        onError(error instanceof Error ? error.message : "Upload failed. Please try again.");
      }}
      config={{
        mode: "auto",
      }}
      className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/80 ut-button:rounded-full ut-button:bg-neutral-950 ut-button:px-5 ut-button:text-white ut-button:hover:bg-amber-500 ut-button:hover:text-black ut-label:text-neutral-900 ut-allowed-content:text-neutral-500"
    />
  );
}
