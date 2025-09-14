"use client";
import { CreateProject } from "@/app/actions";
import { UploadDropzone } from "@/app/lib/uploadthing";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, XIcon } from "lucide-react";
import Link from "next/link";
import { useForm } from '@conform-to/react'
import { parseWithZod } from "@conform-to/zod";
import { ProjectSchema } from "@/app/lib/zodSchemas";
import { useActionState, useState } from "react";
import Image from "next/image";
import { categories } from "@/app/lib/categories";
import { SubmitButton } from "@/app/componets/SubmitButtons";


export default function ProjectCreateRoute(){
    const [images, setImages] = useState<string[]>([]);
    const [lastResult, action] = useActionState(CreateProject, undefined);
    const [form, fields] = useForm({
        lastResult,
        onValidate({formData}) {
            return parseWithZod(formData, {schema: ProjectSchema});
        },
        shouldValidate: "onBlur",
        shouldRevalidate: "onInput"
    });

    const handleDelete = (index: number) => {
        setImages(images.filter((_, i) => i !== index));
    };
    return (
        <form id={form.id} onSubmit={form.onSubmit} action={action}>
            <div className="flex items-center gap-4">
                <Button asChild variant="outline" size="icon">
                    <Link href="/dashboard/Projects">
                        <ChevronLeft className="h-4 w-4"/>
                    </Link>
                </Button>
                <h1 className="text-xl font-semibold tracking-tight">New Project</h1>
            </div>
            <Card className="mt-5">
                <CardHeader>
                    <CardTitle>Project Details </CardTitle>
                    <CardDescription>Here you add a new Project...</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col gap-3">
                            <Label>Name</Label>
                            <Input className="w-full" placeholder="Project Name" type="text" key={fields.name.key} name={fields.name.name} defaultValue={fields.name.initialValue}  />
                            <p className="text-red-500">{fields.name.errors}</p>
                        </div>
                        <div className="flex flex-col gap-3">
                            <Label>Description</Label>
                            <Textarea placeholder="Write the Project description here..." key={fields.description.key} name={fields.description.name} defaultValue={fields.description.initialValue}/>
                            <p className="text-red-500">{fields.description.errors}</p>
                        </div>

                        <div className="flex flex-col gap-3">
                            <Label>Featured</Label>
                            <Switch key={fields.isFeatured.key} name={fields.isFeatured.name} defaultValue={fields.isFeatured.initialValue}/>
                            <p className="text-red-500">{fields.isFeatured.errors}</p>
                        </div>
                        <div className="flex flex-col gap-3">
                            <Label>Status</Label>
                            <Select key={fields.status.key} name={fields.status.name} defaultValue={fields.status.initialValue}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Status"/>
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
                            <Select key={fields.category.key} name={fields.category.name} defaultValue={fields.category.initialValue}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Category"/>
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
                            <input type="hidden" value={images} key={fields.images.key} name={fields.images.name} defaultValue={fields.images.initialValue as any}    />
                            {images.length > 0 ? (
                                <div className="flex gap-5">
                                    {images.map((image,index) => (
                                        <div key={index} className="relative w-[100px] h-[100px">
                                            <Image height={100} width={100} src={image} alt="Prodcut Image" className="w-full h-full object-cover rounded-lg border"/>
                                            <button onClick={() => handleDelete(index)} type="button" className="absolute -top-3 -right-3 bg-red-500  p-2 rounded-lg text-white">
                                                <XIcon className="w-3 h-3"/>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                ) : (            
                                    <UploadDropzone
                                        endpoint="imageUploader"
                                        onClientUploadComplete={(res) => {
                                            console.log("Uploaded files:", res);
                                            setImages(res.map((r) => r.url));
                                        }}
                                        onUploadError={(error) => {
                                            console.error("Upload error:", error);
                                            alert("Upload failed: " + error.message);
                                        }}
                                        />

                                )
                            }
                            <p className="text-red-500">{fields.images.errors}</p>
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <SubmitButton text="Create Project"/>
                </CardFooter>
            </Card>
        </form>
    );
} 