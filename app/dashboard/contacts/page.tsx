import { prisma } from "@/app/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, PlusCircle, UserIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

async function getData() {
    const data = await prisma.contact.findMany({
        orderBy: {
            createdAt: "desc",
        },
    });
    return data;
}


export default async function ContactsRoute() {
    const data = await getData()
    return(
        <>
        <div className="flex justify-end items-center">
            <Button asChild className="flex items-center gap-x-2">
                <Link href="/dashboard/contacts/create">
                    <PlusCircle className="w-3.5 h-3.5"/>
                    <span>Add Contact</span>
                </Link>

            </Button>
        </div>
        <Card className="mt-5">
            <CardHeader>
                <CardTitle>Contacts</CardTitle>
                <CardDescription>Manage Your Contacts and View</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>

                            <TableHead>Name</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Address</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead className="text-end">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((item) =>(
                        <TableRow key={item.id}>

                            <TableCell>{item.name}</TableCell>                            
                            <TableCell>{item.phone}</TableCell>
                            <TableCell>{item.email}</TableCell>
                            <TableCell>{item.description}</TableCell>
                            <TableCell>{item.role}</TableCell>
                            <TableCell>{item.address}</TableCell>
                            <TableCell>{item.price}</TableCell>
                            <TableCell className="text-end">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button size="icon" variant="ghost">
                                            <MoreHorizontal className="h-4 w-4"/>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Action</DropdownMenuLabel>
                                        <DropdownMenuSeparator/>
                                        <DropdownMenuItem asChild>
                                            <Link href={`/dashboard/contacts/${item.id}`}>Edit</Link>
                                        </DropdownMenuItem>

                                        <DropdownMenuItem asChild>
                                            <Link href={`/dashboard/contacts/${item.id}/delete`}>Delete</Link>
                                        </DropdownMenuItem>

                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
        </>
    );

}