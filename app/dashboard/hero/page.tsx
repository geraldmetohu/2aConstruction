
// app/dashboard/hero-videos/page.tsx  (SERVER COMPONENT)
import { prisma } from "@/app/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

async function getData() {
  return prisma.heroVideo.findMany({ orderBy: { createdAt: "desc" } });
}

export default async function HeroVideosRoute() {
  const data = await getData();
  return (
    <>
      <div className="flex items-center justify-end">
        <Button asChild className="flex gap-x-2">
          <Link href="/dashboard/hero/create">
            <PlusCircle className="h-3.5 w-3.5" />
            <span>Add Hero Video</span>
          </Link>
        </Button>
      </div>

      <Card className="mt-5">
        <CardHeader>
          <CardTitle>Hero Videos</CardTitle>
          <CardDescription>Manage your hero video slides</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Poster</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Subtitle</TableHead>
                <TableHead>CTA</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-end">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    {item.posterUrl ? (
                      <Image
                        alt={item.title}
                        src={item.posterUrl}
                        width={64}
                        height={64}
                        className="h-16 w-16 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="grid h-16 w-16 place-items-center rounded-lg bg-neutral-100 text-xs text-neutral-500">
                        No poster
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{item.title}</TableCell>
                  <TableCell className="font-medium">{item.subtitle}</TableCell>
                  <TableCell className="font-medium">
                    {item.ctaText ? (
                      <span>
                        {item.ctaText} → <span className="text-neutral-500">{item.ctaHref}</span>
                      </span>
                    ) : (
                      <span className="text-neutral-500">—</span>
                    )}
                  </TableCell>
                  <TableCell>{item.isActive ? "Active" : "Hidden"}</TableCell>
                  <TableCell className="text-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-neutral-100">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Action</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/hero/${item.id}/delete`}>Delete</Link>
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