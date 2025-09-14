"use client";
import { CreateBeforeAfter,  } from "@/app/actions";
import { SubmitButton } from "@/app/componets/SubmitButtons";
import { UploadDropzone } from "@/app/lib/uploadthing";
import { beforeafterSchema } from "@/app/lib/zodSchemas";
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

export default function BeforeafterRoute(){
    const [image, setImages] = useState <string | undefined>(undefined);

    const [lastResult, action] = useActionState(CreateBeforeAfter, undefined);
    const [form, fields] = useForm({
        lastResult,

        onValidate({formData}) {
           return parseWithZod(formData, {schema: beforeafterSchema}) 
        },
        shouldValidate: "onBlur",
        shouldRevalidate: "onInput"
    });
    return (
        <form id={form.id} onSubmit={form.onSubmit} action={action}>
            <div className="flex items-center gap-x-4">
                <Button asChild variant="outline" size="icon">
                    <Link href="/dashboard/beforeafter">
                        <ChevronLeft className="w-4 h-4" />
                    </Link>

                </Button>
                <h1 className="text-xl font-semibold tracking-tight">New B/A Image</h1>
            </div>
            <Card>
                <CardHeader className="mt-5">
                    <CardTitle>B/A Details</CardTitle>
                    <CardDescription>Create your B/A here</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-y-6">
                        <div className="flex flex-col gap-3">
                            <Label>Name</Label>
                            <Input name={fields.title.name} key={fields.title.key} defaultValue={fields.title.initialValue} type="text" placeholder="Create title for B/A Image" />
                            <p className="text-red-500">{fields.title.errors}</p>
                        </div>
                        <div className="flex flex-col gap-3">
                            <Label> Before Image</Label>
                            <input 
                                type="hidden" 
                                value={image ?? ""} // ✅ Ensure it's never undefined
                                key={fields.imageStringBefore.key} 
                                name={fields.imageStringBefore.name} 
/>

                            {image !== undefined ? (
                                <Image 
                                    src={image} 
                                    alt="Before Image" 
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
                                endpoint="beforeImageRoute" />
                            )}

                            <p className="text-red-500">{fields.imageStringBefore.errors}</p>
                        </div>
                        <div className="flex flex-col gap-3">
                            <Label> After Image</Label>
                            <input 
                                type="hidden" 
                                value={image ?? ""} // ✅ Ensure it's never undefined
                                key={fields.imageStringAfter.key} 
                                name={fields.imageStringAfter.name} 
/>

                            {image !== undefined ? (
                                <Image 
                                    src={image} 
                                    alt="After Image" 
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
                                endpoint="afterImageRoute" />
                            )}

                            <p className="text-red-500">{fields.imageStringAfter.errors}</p>
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <SubmitButton text="Create B/A Image" />
                </CardFooter>
            </Card>
        </form>
    );
}