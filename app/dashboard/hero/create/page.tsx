"use client";

import { useState, useActionState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardDescription,
  CardFooter, CardHeader, CardTitle
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/app/componets/SubmitButtons";
import { UploadDropzone } from "@/app/lib/uploadthing";
import { useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { heroVideoSchema } from "@/app/lib/zodSchemas";
import { CreateHeroVideo } from "@/app/actions";

export default function CreateHeroVideoPage() {
  const [posterUrl, setPosterUrl] = useState<string | undefined>();
  const [videoUrl, setVideoUrl] = useState<string | undefined>();

  const [lastResult, action] = useActionState(CreateHeroVideo, undefined);

  const [form, fields] = useForm({
    lastResult,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: heroVideoSchema });
    },
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
  });

  const extractURL = (file: any) =>
    file.url ?? file.serverData?.url ?? "";

  return (
    <form id={form.id} onSubmit={form.onSubmit} action={action} className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
          <Link href="/dashboard/hero-videos">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>

        <h1 className="text-xl font-semibold tracking-tight">New Hero Video</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>Upload your hero background video and optional poster.</CardDescription>
        </CardHeader>

        <CardContent className="grid gap-6">

          {/* Title */}
          <div className="grid gap-2">
            <Label>Title</Label>
            <Input
              name={fields.title.name}
              key={fields.title.key}
              defaultValue={fields.title.initialValue}
              placeholder="Example: Loft conversion"
            />
            <p className="text-red-500 text-sm">{fields.title.errors}</p>
          </div>

          {/* Subtitle */}
          <div className="grid gap-2">
            <Label>Subtitle (optional)</Label>
            <Input
              name={fields.subtitle.name}
              key={fields.subtitle.key}
              defaultValue={fields.subtitle.initialValue}
              placeholder="Short subtitle text"
            />
            <p className="text-red-500 text-sm">{fields.subtitle.errors}</p>
          </div>

          {/* CTA */}
          <div className="grid gap-2 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>CTA Text</Label>
              <Input
                name={fields.ctaText.name}
                key={fields.ctaText.key}
                defaultValue={fields.ctaText.initialValue}
              />
              <p className="text-red-500 text-sm">{fields.ctaText.errors}</p>
            </div>

            <div className="grid gap-2">
              <Label>CTA Link</Label>
              <Input
                name={fields.ctaHref.name}
                key={fields.ctaHref.key}
                defaultValue={fields.ctaHref.initialValue}
              />
              <p className="text-red-500 text-sm">{fields.ctaHref.errors}</p>
            </div>
          </div>

          {/* VIDEO UPLOAD */}
          <input type="hidden" name={fields.videoUrl.name} value={videoUrl ?? ""} />
          <div className="grid gap-2">
            <Label>Video (MP4/WebM)</Label>

            {videoUrl ? (
              <video src={videoUrl} controls className="w-full max-w-md rounded-lg border" />
            ) : (
              <UploadDropzone
                endpoint="heroVideoRoute"
                onClientUploadComplete={(files: any[]) => {
                  const url = extractURL(files[0]);
                  setVideoUrl(url);
                }}
                onUploadError={(error) => {
                  alert(error instanceof Error ? error.message : "Upload failed");
                }}
              />
            )}

            <p className="text-red-500 text-sm">{fields.videoUrl.errors}</p>
          </div>

          {/* POSTER UPLOAD */}
          <input type="hidden" name={fields.posterUrl.name} value={posterUrl ?? ""} />
          <div className="grid gap-2">
            <Label>Poster (optional)</Label>

            {posterUrl ? (
              <Image src={posterUrl} alt="Poster" width={240} height={160}
                     className="h-40 w-60 rounded-lg object-cover border" />
            ) : (
              <UploadDropzone
                endpoint="bannerImageRoute"
                onClientUploadComplete={(files: any[]) => {
                  const url = extractURL(files[0]);
                  setPosterUrl(url);
                }}
                onUploadError={(error) => {
                  alert(error instanceof Error ? error.message : "Upload failed");
                }}
              />
            )}

            <p className="text-red-500 text-sm">{fields.posterUrl.errors}</p>
          </div>

        </CardContent>

        <CardFooter>
          <SubmitButton text="Create Hero Video" />
        </CardFooter>
      </Card>
    </form>
  );
}
