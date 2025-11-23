"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { SubmitButton } from "../SubmitButtons";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { categories } from "@/app/lib/categories";
import { useActionState, useState } from "react";
import { EditProject } from "@/app/actions";
import { useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { ProjectSchema } from "@/app/lib/zodSchemas";
import { Textarea } from "@/components/ui/textarea";
import { type $Enums } from "@prisma/client";
import SortTableImageList from "./SortTableImageList";
import { deleteFile } from "@/app/api/uploadthing/core";

interface iAppProps {
  data: {
    id: string;
    name: string;
    description: string;
    status: $Enums.ProjectStatus;
    images: string[];
    category: $Enums.Category;
    isFeatured: boolean;
  };
}

export function EditForm({ data }: iAppProps) {
  const [images, setImages] = useState<string[]>(data.images);
  const [lastResult, action] = useActionState(EditProject, undefined);
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

  // Delete from UploadThing storage

await deleteFile(urlToDelete), {
    method: "POST",
    body: JSON.stringify({ url: urlToDelete }),
  };

  // Remove from local state
  setImages((prev) => prev.filter((_, i) => i !== index));
};

  return (
    <form id={form.id} onSubmit={form.onSubmit} action={action}>
      <input type="hidden" name="projectId" value={data.id} />
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
          <Link href="/dashboard/projects">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-xl font-semibold tracking-tight">Edit Project</h1>
      </div>
      <Card className="mt-5">
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
          <CardDescription>Here you can update your project...</CardDescription>
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
                defaultValue={data.name}
              />
              <p className="text-red-500">{fields.name.errors}</p>
            </div>

            <div className="flex flex-col gap-3">
              <Label>Description</Label>
              <Textarea
                placeholder="Write the project description here..."
                key={fields.description.key}
                name={fields.description.name}
                defaultValue={data.description}
              />
              <p className="text-red-500">{fields.description.errors}</p>
            </div>

            <div className="flex flex-col gap-3">
              <Label>Featured</Label>
              <Switch
                key={fields.isFeatured.key}
                name={fields.isFeatured.name}
                defaultChecked={data.isFeatured}
              />
              <p className="text-red-500">{fields.isFeatured.errors}</p>
            </div>

            <div className="flex flex-col gap-3">
              <Label>Status</Label>
              <Select
                key={fields.status.key}
                name={fields.status.name}
                defaultValue={data.status}
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
                defaultValue={data.category}
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

              {/* Hidden field sending images as comma-separated list */}
              <input
                type="hidden"
                value={images.join(",")}
                key={fields.images.key}
                name={fields.images.name}
              />

              <SortTableImageList
                images={images}
                setImages={setImages}
                onDelete={handleDelete}
              />

              <p className="text-red-500">{fields.images.errors}</p>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <SubmitButton text="Edit Project" />
        </CardFooter>
      </Card>
    </form>
  );
}
