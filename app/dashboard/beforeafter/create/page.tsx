"use client";

import { useState, useActionState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft } from "lucide-react";
import { CreateBeforeAfter } from "@/app/actions";
import { SubmitButton } from "@/app/componets/SubmitButtons";
import { UploadDropzone } from "@/app/lib/uploadthing";
import { beforeafterSchema } from "@/app/lib/zodSchemas";
import {
  Card, CardHeader, CardTitle, CardDescription,
  CardContent, CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";

export default function CreateBeforeAfterPage() {
  const [beforeImage, setBeforeImage] = useState<string | undefined>();
  const [afterImage, setAfterImage] = useState<string | undefined>();

  const [lastResult, action] = useActionState(CreateBeforeAfter, undefined);

  const [form, fields] = useForm({
    lastResult,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: beforeafterSchema });
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
          <Link href="/dashboard/beforeafter">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>

        <h1 className="text-xl font-semibold tracking-tight">
          New Before / After
        </h1>
      </div>

      <Card className="mt-5">
        <CardHeader>
          <CardTitle>Before/After Details</CardTitle>
          <CardDescription>Add a new transformation showcase</CardDescription>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col gap-6">

            {/* Title */}
            <div className="flex flex-col gap-2">
              <Label>Title</Label>
              <Input
                name={fields.title.name}
                defaultValue={fields.title.initialValue}
              />
              <p className="text-red-500 text-sm">{fields.title.errors}</p>
            </div>

            {/* BEFORE IMAGE */}
            <input
              type="hidden"
              name={fields.imageStringBefore.name}
              value={beforeImage ?? ""}
            />

            <div className="flex flex-col gap-2">
              <Label>Before Image</Label>

              {beforeImage ? (
                <Image
                  src={beforeImage}
                  alt="Before"
                  width={200}
                  height={200}
                  className="rounded-lg border object-cover"
                />
              ) : (
                <UploadDropzone
                  endpoint="beforeImageRoute"
                  onClientUploadComplete={(files: any[]) => {
                    setBeforeImage(extractURL(files[0]));
                  }}
                  onUploadError={(error) =>
                    alert(error instanceof Error ? error.message : "Upload failed")
                  }
                />
              )}

              <p className="text-red-500 text-sm">
                {fields.imageStringBefore.errors}
              </p>
            </div>

            {/* AFTER IMAGE */}
            <input
              type="hidden"
              name={fields.imageStringAfter.name}
              value={afterImage ?? ""}
            />

            <div className="flex flex-col gap-2">
              <Label>After Image</Label>

              {afterImage ? (
                <Image
                  src={afterImage}
                  alt="After"
                  width={200}
                  height={200}
                  className="rounded-lg border object-cover"
                />
              ) : (
                <UploadDropzone
                  endpoint="afterImageRoute"
                  onClientUploadComplete={(files: any[]) => {
                    setAfterImage(extractURL(files[0]));
                  }}
                  onUploadError={(error) =>
                    alert(error instanceof Error ? error.message : "Upload failed")
                  }
                />
              )}

              <p className="text-red-500 text-sm">
                {fields.imageStringAfter.errors}
              </p>
            </div>

          </div>
        </CardContent>

        <CardFooter>
          <SubmitButton text="Create Before/After" />
        </CardFooter>
      </Card>
    </form>
  );
}
