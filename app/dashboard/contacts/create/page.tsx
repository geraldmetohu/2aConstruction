"use client";
import { CreateContact } from "@/app/actions";
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
import { ContactSchema } from "@/app/lib/zodSchemas";
import { useActionState, useState } from "react";
import Image from "next/image";
import { roles } from "@/app/lib/roles";
import { SubmitButton } from "@/app/componets/SubmitButtons";


export default function ContactCreateRoute(){
    const [images, setImages] = useState<string[]>([]);
    const [lastResult, action] = useActionState(CreateContact, undefined);
    const [form, fields] = useForm({
        lastResult,
        onValidate({formData}) {
            return parseWithZod(formData, {schema: ContactSchema});
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
                    <Link href="/dashboard/contacts">
                        <ChevronLeft className="h-4 w-4"/>
                    </Link>
                </Button>
                <h1 className="text-xl font-semibold tracking-tight">New Contact</h1>
            </div>
            <Card className="mt-5">
                <CardHeader>
                    <CardTitle>Contact Details </CardTitle>
                    <CardDescription>Here you add a new Contact...</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col gap-3">
                            <Label>Name</Label>
                            <Input className="w-full" placeholder="Contact Name" type="text" key={fields.name.key} name={fields.name.name} defaultValue={fields.name.initialValue}  />
                            <p className="text-red-500">{fields.name.errors}</p>
                        </div>
                        <div className="flex flex-col gap-3">
                            <Label>Email</Label>
                            <Input className="w-full" placeholder="Contact Email" type="text" key={fields.email.key} name={fields.email.name} defaultValue={fields.email.initialValue}  />
                            <p className="text-red-500">{fields.email.errors}</p>
                        </div>                        
                        <div className="flex flex-col gap-3">
                            <Label>Phone</Label>
                            <Input className="w-full" placeholder="Contact Phone" type="text" key={fields.phone.key} name={fields.phone.name} defaultValue={fields.phone.initialValue}  />
                            <p className="text-red-500">{fields.phone.errors}</p>
                        </div>
                        <div className="flex flex-col gap-3">
                            <Label>Description</Label>
                            <Textarea placeholder="Write the Contact description here..." key={fields.description.key} name={fields.description.name} defaultValue={fields.description.initialValue}/>
                            <p className="text-red-500">{fields.description.errors}</p>
                        </div>
                        <div className="flex flex-col gap-3">
                            <Label>Role</Label>
                            <Select key={fields.role.key} name={fields.role.name} defaultValue={fields.role.initialValue}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Role"/>
                                </SelectTrigger>
                                <SelectContent>
                                    {roles.map((role) => (
                                        <SelectItem key={role.id} value={role.name}>
                                            {role.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-red-500">{fields.role.errors}</p>
                        </div>
                        <div className="flex flex-col gap-3">
                            <Label>Address</Label>
                            <Input className="w-full" placeholder="Contact Address" type="text" key={fields.address.key} name={fields.address.name} defaultValue={fields.address.initialValue}  />
                            <p className="text-red-500">{fields.address.errors}</p>
                        </div>     
                        <div className="flex flex-col gap-3">
                            <Label>Price</Label>
                            <Input className="w-full" placeholder="Price" type="text" key={fields.price.key} name={fields.price.name} defaultValue={fields.price.initialValue}  />
                            <p className="text-red-500">{fields.price.errors}</p>
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