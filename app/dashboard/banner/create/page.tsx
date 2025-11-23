"use client";

import { useState, useActionState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft } from "lucide-react";
import { CreateBanner } from "@/app/actions";
import { SubmitButton } from "@/app/componets/SubmitButtons";
import { UploadDropzone } from "@/app/lib/uploadthing";
import { bannerSchema } from "@/app/lib/zodSchemas";
import {
  Card, CardHeader, CardTitle, CardDescription,
  CardContent, CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";

export default function CreateBannerPage() {
  const [image, setImage] = useState<string | undefined>();

  const [lastResult, action] = useActionState(CreateBanner, undefined);

  const [form, fields] = useForm({
    lastResult,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: bannerSchema });
    },
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
  });

  const extractURL = (file: any) =>
    file.url ?? file.serverData?.url ?? "";

  return (
    <form id={form.id} onSubmit={form.onSubmit} action={action}>
      <div className="flex items-center gap-x-4">
        <Button asChild variant="outline" size="icon">
          <Link href="/dashboard/banner">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>

        <h1 className="text-xl font-semibold tracking-tight">New Banner</h1>
      </div>

      <Card className="mt-5">
        <CardHeader>
          <CardTitle>Banner Details</CardTitle>
          <CardDescription>Create your homepage banner</CardDescription>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col gap-6">

            <div className="flex flex-col gap-2">
              <Label>Title</Label>
              <Input name={fields.title.name} defaultValue={fields.title.initialValue} />
              <p className="text-red-500 text-sm">{fields.title.errors}</p>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Subtitle</Label>
              <Input name={fields.subtitle.name} defaultValue={fields.subtitle.initialValue} />
              <p className="text-red-500 text-sm">{fields.subtitle.errors}</p>
            </div>

            <div className="flex flex-col gap-2">
              <Label>CTA Text</Label>
              <Input name={fields.ctatext.name} defaultValue={fields.ctatext.initialValue} />
              <p className="text-red-500 text-sm">{fields.ctatext.errors}</p>
            </div>

            <div className="flex flex-col gap-2">
              <Label>CTA Href</Label>
              <Input name={fields.ctahref.name} defaultValue={fields.ctahref.initialValue} />
              <p className="text-red-500 text-sm">{fields.ctahref.errors}</p>
            </div>

            {/* IMAGE UPLOAD */}
            <input type="hidden" name={fields.imageString.name} value={image ?? ""} />

            <div className="flex flex-col gap-2">
              <Label>Banner Image</Label>

              {image ? (
                <Image
                  src={image}
                  alt="Banner"
                  width={300}
                  height={160}
                  className="rounded-lg border object-cover"
                />
              ) : (
                <UploadDropzone
                  endpoint="bannerImageRoute"
                  onClientUploadComplete={(files: any[]) => {
                    const url = extractURL(files[0]);
                    setImage(url);
                  }}
                  onUploadError={(error) =>
                    alert(error instanceof Error ? error.message : "Upload failed")
                  }
                />
              )}

              <p className="text-red-500 text-sm">{fields.imageString.errors}</p>
            </div>
          </div>
        </CardContent>

        <CardFooter>
          <SubmitButton text="Create Banner" />
        </CardFooter>
      </Card>
    </form>
  );
}
