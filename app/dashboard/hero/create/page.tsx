// app/dashboard/hero-videos/create/page.tsx  (CLIENT COMPONENT)
"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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

  return (
    <form id={form.id} onSubmit={form.onSubmit} action={action} className="space-y-6">
      <div className="flex items-center gap-x-4">
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
          <CardDescription>Upload a short, quiet video suitable for hero background.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid gap-2">
            <Label>Title</Label>
            <Input name={fields.title.name} key={fields.title.key} defaultValue={fields.title.initialValue} placeholder="E.g., Loft conversion in Barnet" />
            <p className="text-red-500 text-sm">{fields.title.errors}</p>
          </div>

          <div className="grid gap-2">
            <Label>Subtitle (optional)</Label>
            <Input name={fields.subtitle.name} key={fields.subtitle.key} defaultValue={fields.subtitle.initialValue} placeholder="A short supporting line" />
            <p className="text-red-500 text-sm">{fields.subtitle.errors}</p>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>CTA Text (optional)</Label>
              <Input name={fields.ctaText.name} key={fields.ctaText.key} defaultValue={fields.ctaText.initialValue} placeholder="Get a quote" />
              <p className="text-red-500 text-sm">{fields.ctaText.errors}</p>
            </div>
            <div className="grid gap-2">
              <Label>CTA Href (optional)</Label>
              <Input name={fields.ctaHref.name} key={fields.ctaHref.key} defaultValue={fields.ctaHref.initialValue} placeholder="/contact#quote" />
              <p className="text-red-500 text-sm">{fields.ctaHref.errors}</p>
            </div>
          </div>

          {/* VIDEO UPLOAD */}
          <input type="hidden" name={fields.videoUrl.name} key={fields.videoUrl.key} value={videoUrl ?? ""} />
          <div className="grid gap-2">
            <Label>Video (MP4/WebM)</Label>
            {videoUrl ? (
              <video src={videoUrl} controls className="w-full max-w-md rounded-lg border" />
            ) : (
              <UploadDropzone
                endpoint="heroVideoRoute" // configure in uploadthing
                onClientUploadComplete={(res) => setVideoUrl(res?.[0]?.url)}
                onUploadError={() => alert("Video upload failed")}
              />
            )}
            <p className="text-red-500 text-sm">{fields.videoUrl.errors}</p>
          </div>

          {/* POSTER UPLOAD */}
          <input type="hidden" name={fields.posterUrl.name} key={fields.posterUrl.key} value={posterUrl ?? ""} />
          <div className="grid gap-2">
            <Label>Poster (image) — optional</Label>
            {posterUrl ? (
              <Image src={posterUrl} alt="Poster" width={240} height={160} className="h-40 w-60 rounded-lg object-cover border" />
            ) : (
              <UploadDropzone
                endpoint="bannerImageRoute" // reuse your existing image endpoint
                onClientUploadComplete={(res) => setPosterUrl(res?.[0]?.url)}
                onUploadError={() => alert("Poster upload failed")}
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