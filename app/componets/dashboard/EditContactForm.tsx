"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, XIcon } from "lucide-react";
import Link from "next/link";
import { SubmitButton } from "../SubmitButtons";
import { Input } from "@/components/ui/input";
import { roles } from "@/app/lib/roles";
import { useActionState, useState } from "react";
import { CreateContact, EditContact } from "@/app/actions";
import { useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { ContactSchema } from "@/app/lib/zodSchemas";
import { Textarea } from "@/components/ui/textarea";
import { type $Enums } from "@prisma/client";

interface iAppProps {
    data: {
        id: string;
        name: string;
        email: string;
        phone: string;
        description: string;
        role: $Enums.Role;
        address: string;
        price: string;
    }
}

export function EditContactForm({ data}: iAppProps){
    const [lastResult, action] = useActionState(EditContact, undefined);
    const [form, fields] = useForm({
        lastResult,
        onValidate({formData}) {
            return parseWithZod(formData, {schema: ContactSchema});
        },
        shouldValidate: "onBlur",
        shouldRevalidate: "onInput"
    });

    return (
        <form id={form.id} onSubmit={form.onSubmit} action={action}>
            <input type="hidden" name="contactId" value={data.id} />
        <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="icon">
                <Link href="/dashboard/contacts">
                    <ChevronLeft className="h-4 w-4"/>
                </Link>
            </Button>
            <h1 className="text-xl font-semibold tracking-tight">Edit Contact</h1>
        </div>
        <Card className="mt-5">
            <CardHeader>
                <CardTitle>Contact Details </CardTitle>
                <CardDescription>Here you can update your Contact...</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-3">
                        <Label>Name</Label>
                        <Input className="w-full" placeholder="Contact Name" type="text" key={fields.name.key} name={fields.name.name} defaultValue={data.name}  />
                        <p className="text-red-500">{fields.name.errors}</p>
                    </div>                    
                    <div className="flex flex-col gap-3">
                        <Label>Email</Label>
                        <Input className="w-full" placeholder="Contact Email" type="text" key={fields.email.key} name={fields.email.name} defaultValue={data.email}  />
                        <p className="text-red-500">{fields.email.errors}</p>
                    </div>                    
                    <div className="flex flex-col gap-3">
                        <Label>Phone</Label>
                        <Input className="w-full" placeholder="Contact Phone" type="text" key={fields.phone.key} name={fields.phone.name} defaultValue={data.phone}  />
                        <p className="text-red-500">{fields.phone.errors}</p>
                    </div>                    

                    <div className="flex flex-col gap-3">
                        <Label>Description</Label>
                        <Textarea placeholder="Write the contact description here..." key={fields.description.key} name={fields.description.name} defaultValue={data.description}/>
                        <p className="text-red-500">{fields.description.errors}</p>
                    </div>
                    <div className="flex flex-col gap-3">
                        <Label>Address</Label>
                        <Input className="w-full" placeholder="Contact Address" type="text" key={fields.address.key} name={fields.address.name} defaultValue={data.address}  />
                        <p className="text-red-500">{fields.address.errors}</p>
                    </div>
                    <div className="flex flex-col gap-3">
                        <Label>Price</Label>
                        <Input className="w-full" placeholder="Contact Price" type="text" key={fields.price.key} name={fields.price.name} defaultValue={data.price}  />
                        <p className="text-red-500">{fields.price.errors}</p>
                    </div>

                    <div className="flex flex-col gap-3">
                        <Label>Role</Label>
                        <Select key={fields.role.key} name={fields.role.name} defaultValue={data.role}>
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
                </div>
            </CardContent>
            <CardFooter>
                <SubmitButton text="Edit Contact"/>
            </CardFooter>
        </Card>
    </form>
    )
}