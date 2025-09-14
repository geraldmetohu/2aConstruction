import { prisma } from "@/app/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, PlusCircle, UserIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

async function getData() {
    const data = await prisma.project.findMany({
        orderBy: {
            createdAt: "desc",
        },
    });
    return data;
}


export default async function ProjectsRoute() {
    const data = await getData()
    return(
        <>
        <div className="flex justify-end items-center">
            <Button asChild className="flex items-center gap-x-2">
                <Link href="/dashboard/projects/create">
                    <PlusCircle className="w-3.5 h-3.5"/>
                    <span>Add Project</span>
                </Link>

            </Button>
        </div>
        <Card className="mt-5">
            <CardHeader>
                <CardTitle>Projects</CardTitle>
                <CardDescription>Manage Your Projects and View</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Images</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-end">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((item) =>(
                            <TableRow key={item.id}>
                            <TableCell>
                                <Image alt="Project Image" src={item.images[0]} height={64} width={64} className="rounded-md object-cover h-16 w-16" />
                            </TableCell>
                            <TableCell>{item.name}</TableCell>
                            <TableCell>{item.status}</TableCell>
                            <TableCell>{item.category}</TableCell>
                            <TableCell>{new Intl.DateTimeFormat(['ban','id']).format(item.createdAt)}</TableCell>
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
                                            <Link href={`/dashboard/projects/${item.id}`}>Edit</Link>
                                        </DropdownMenuItem>

                                        <DropdownMenuItem asChild>
                                            <Link href={`/dashboard/projects/${item.id}/delete`}>Delete</Link>
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