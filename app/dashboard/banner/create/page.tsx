"use client";
import { CreateBanner } from "@/app/actions";
import { SubmitButton } from "@/app/componets/SubmitButtons";
import { UploadDropzone } from "@/app/lib/uploadthing";
import { bannerSchema } from "@/app/lib/zodSchemas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { ChevronLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormState } from "react-dom";

export default function BannerRoute(){
    const [image, setImages] = useState <string | undefined>(undefined);
    const [lastResult, action] = useActionState(CreateBanner, undefined);
    const [form, fields] = useForm({
        lastResult,

        onValidate({formData}) {
           return parseWithZod(formData, {schema: bannerSchema}) 
        },
        shouldValidate: "onBlur",
        shouldRevalidate: "onInput"
    });
    return (
        <form id={form.id} onSubmit={form.onSubmit} action={action}>
            <div className="flex items-center gap-x-4">
                <Button asChild variant="outline" size="icon">
                    <Link href="/dashboard/banner">
                        <ChevronLeft className="w-4 h-4" />
                    </Link>

                </Button>
                <h1 className="text-xl font-semibold tracking-tight">New Banner</h1>
            </div>
            <Card>
                <CardHeader className="mt-5">
                    <CardTitle>Banner Details</CardTitle>
                    <CardDescription>Create your banner here</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-y-6">
                        <div className="flex flex-col gap-3">
                            <Label>Name</Label>
                            <Input name={fields.title.name} key={fields.title.key} defaultValue={fields.title.initialValue} type="text" placeholder="Create title for Banner" />
                            <p className="text-red-500">{fields.title.errors}</p>
                        </div>
                        <div className="flex flex-col gap-3">
                            <Label>Subtitle</Label>
                            <Input name={fields.subtitle.name} key={fields.subtitle.key} defaultValue={fields.subtitle.initialValue} type="text" placeholder="Create title for Banner" />
                            <p className="text-red-500">{fields.subtitle.errors}</p>
                        </div>                        
                        <div className="flex flex-col gap-3">
                            <Label>CTA Text</Label>
                            <Input name={fields.ctatext.name} key={fields.ctatext.key} defaultValue={fields.ctatext.initialValue} type="text" placeholder="Create title for Banner" />
                            <p className="text-red-500">{fields.ctatext.errors}</p>
                        </div>                        
                        <div className="flex flex-col gap-3">
                            <Label>CTA Href</Label>
                            <Input name={fields.ctahref.name} key={fields.ctahref.key} defaultValue={fields.ctahref.initialValue} type="text" placeholder="Create title for Banner" />
                            <p className="text-red-500">{fields.ctahref.errors}</p>
                        </div>
                        <div className="flex flex-col gap-3">
                            <Label>Image</Label>
                            <input 
                                type="hidden" 
                                value={image ?? ""} // ✅ Ensure it's never undefined
                                key={fields.imageString.key} 
                                name={fields.imageString.name} 
/>

                            {image !== undefined ? (
                                <Image 
                                    src={image} 
                                    alt="Product Image" 
                                    width={200} height={200} 
                                    className="w-[200] h-[200] object-cover border rounded-lg" />
                            ): (
                                <UploadDropzone 
                                onClientUploadComplete={(res) => {
                                    setImages(res[0].url);
                                }} 
                                onUploadError={() => {
                                    alert("Something went wrong")
                                }}
                                endpoint="bannerImageRoute" />
                            )}

                            <p className="text-red-500">{fields.imageString.errors}</p>
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