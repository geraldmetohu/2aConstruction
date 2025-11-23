import { prisma } from "@/app/lib/db";
import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from "@/components/ui/card";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

async function getData() {
  return prisma.beforeAfter.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export default async function BeforeAfterRoute() {
  const data = await getData();

  return (
    <>
      <div className="flex items-center justify-end">
        <Button asChild className="flex gap-x-2">
          <Link href="/dashboard/beforeafter/create">
            <PlusCircle className="h-3.5 w-3.5" />
            <span>Add Before/After</span>
          </Link>
        </Button>
      </div>

      <Card className="mt-5">
        <CardHeader>
          <CardTitle>Before / After Images</CardTitle>
          <CardDescription>Manage your showcase transformations</CardDescription>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Before</TableHead>
                <TableHead>After</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="text-end">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Image
                      src={item.imageStringBefore}
                      alt="Before"
                      width={64}
                      height={64}
                      className="rounded-lg object-cover h-16 w-16"
                    />
                  </TableCell>

                  <TableCell>
                    <Image
                      src={item.imageStringAfter}
                      alt="After"
                      width={64}
                      height={64}
                      className="rounded-lg object-cover h-16 w-16"
                    />
                  </TableCell>

                  <TableCell className="font-medium">{item.title}</TableCell>

                  <TableCell className="text-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/beforeafter/${item.id}/delete`}>
                            Delete
                          </Link>
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
