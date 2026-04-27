"use client";

import { CreateProject } from "@/app/actions";
import { SubmitButton } from "@/app/componets/SubmitButtons";
import SortableImageList from "@/app/componets/dashboard/SortTableImageList";
import { categories } from "@/app/lib/categories";
import { ProjectSchema } from "@/app/lib/zodSchemas";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { deleteFile } from "@/app/api/uploadthing/core";

export function CreateProjectForm({
  sourceOptions,
}: {
  sourceOptions: {
    id: string;
    label: string;
    images: string[];
  }[];
}) {
  const [images, setImages] = useState<string[]>([]);
  const [sourceClientProjectId, setSourceClientProjectId] = useState("");
  const [lastResult, action] = useActionState(CreateProject, undefined);

  const [form, fields] = useForm({
    lastResult,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: ProjectSchema });
    },
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
  });

  const handleDelete = async (index: number) => {
    const urlToDelete = images[index];

    await deleteFile(urlToDelete), {
      method: "POST",
      body: JSON.stringify({ url: urlToDelete }),
    };

    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const selectedSource = sourceOptions.find((item) => item.id === sourceClientProjectId);

  return (
    <form id={form.id} onSubmit={form.onSubmit} action={action}>
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
          <Link href="/dashboard/projects">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-xl font-semibold tracking-tight">New Project</h1>
      </div>
      <Card className="mt-5">
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
          <CardDescription>Here you add a new project...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <Label>Name</Label>
              <Input
                className="w-full"
                placeholder="Project Name"
                type="text"
                key={fields.name.key}
                name={fields.name.name}
                defaultValue={fields.name.initialValue}
              />
              <p className="text-red-500">{fields.name.errors}</p>
            </div>

            <div className="flex flex-col gap-3">
              <Label>Description</Label>
              <Textarea
                placeholder="Write the project description here..."
                key={fields.description.key}
                name={fields.description.name}
                defaultValue={fields.description.initialValue}
              />
              <p className="text-red-500">{fields.description.errors}</p>
            </div>

            <div className="flex flex-col gap-3">
              <Label>Featured</Label>
              <Switch
                key={fields.isFeatured.key}
                name={fields.isFeatured.name}
                defaultChecked={
                  fields.isFeatured.initialValue === "on" ||
                  fields.isFeatured.initialValue === "true"
                }
              />
              <p className="text-red-500">{fields.isFeatured.errors}</p>
            </div>

            <div className="flex flex-col gap-3">
              <Label>Status</Label>
              <Select
                key={fields.status.key}
                name={fields.status.name}
                defaultValue={fields.status.initialValue}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-red-500">{fields.status.errors}</p>
            </div>

            <div className="flex flex-col gap-3">
              <Label>Category</Label>
              <Select
                key={fields.category.key}
                name={fields.category.name}
                defaultValue={fields.category.initialValue}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-red-500">{fields.category.errors}</p>
            </div>

            <div className="flex flex-col gap-3">
              <Label>Images</Label>
              <input
                type="hidden"
                key={fields.images.key}
                name={fields.images.name}
                value={images.join(",")}
              />
              <SortableImageList
                images={images}
                setImages={setImages}
                onDelete={handleDelete}
              />
              <p className="text-red-500">{fields.images.errors}</p>
            </div>

            <div className="flex flex-col gap-3">
              <Label>Related client project</Label>
              <Select
                key={fields.sourceClientProjectId.key}
                name={fields.sourceClientProjectId.name}
                value={sourceClientProjectId}
                onValueChange={setSourceClientProjectId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a client project if this public case study comes from a live dashboard" />
                </SelectTrigger>
                <SelectContent>
                  {sourceOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-red-500">{fields.sourceClientProjectId.errors}</p>
            </div>

            {selectedSource && (
              <div className="flex flex-col gap-3 rounded-2xl border bg-muted/20 p-4">
                <Label>Existing dashboard image URLs</Label>
                <p className="text-sm text-muted-foreground">
                  These are already in the system from the client dashboard. Copy the ones you want into your image list or upload different ones above.
                </p>
                <Textarea readOnly value={selectedSource.images.join("\n")} className="min-h-32 font-mono text-xs" />
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <SubmitButton text="Create Project" />
        </CardFooter>
      </Card>
    </form>
  );
}
