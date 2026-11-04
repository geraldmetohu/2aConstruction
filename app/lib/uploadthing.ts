"use client";

import { createElement } from "react";
import { generateReactHelpers, generateUploadButton, generateUploadDropzone } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";
import { compressImages } from "./image-compress";

const BaseUploadButton = generateUploadButton<OurFileRouter>();
const BaseUploadDropzone = generateUploadDropzone<OurFileRouter>();

type BeforeUpload = (files: File[]) => File[] | Promise<File[]>;

/** Every photo is shrunk in the browser first (≈ 10 MB phone photo → a few hundred KB). Other files pass through unchanged. */
function withCompression<P extends { onBeforeUploadBegin?: BeforeUpload }>(props: P): P {
  const own = props.onBeforeUploadBegin;
  return { ...props, onBeforeUploadBegin: async (files: File[]) => compressImages(own ? await own(files) : files) };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const UploadButton = ((props: any) => createElement(BaseUploadButton, withCompression(props))) as unknown as typeof BaseUploadButton;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const UploadDropzone = ((props: any) => createElement(BaseUploadDropzone, withCompression(props))) as unknown as typeof BaseUploadDropzone;

const helpers = generateReactHelpers<OurFileRouter>();
export const uploadFiles = helpers.uploadFiles;

/** Same as uploadthing's hook, but photos are shrunk before upload here too (used by the estimator form). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useUploadThing = ((endpoint: any, opts?: any) =>
  helpers.useUploadThing(endpoint, withCompression(opts ?? {}))) as typeof helpers.useUploadThing;
