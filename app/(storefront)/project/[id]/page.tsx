import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/app/lib/db";
import { Button } from "@/components/ui/button";
import { StarIcon, Calendar, ArrowLeft, Tag } from "lucide-react";
import Link from "next/link";
import { FeaturedProject } from "@/app/componets/storefront/FeaturedProject";
import { ImageSlider } from "@/app/componets/storefront/ImageSlider";
import { ShareButton } from "./share-button";

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    select: { name: true, description: true, images: true },
  });
  if (!project) return {};
  return {
    title: `${project.name} | Our Projects`,
    description: project.description?.slice(0, 160),
    openGraph: {
      title: project.name,
      description: project.description?.slice(0, 200),
      images: project.images?.length ? [{ url: project.images[0] }] : undefined,
    },
  };
}

async function getData(projectId: string) {
  const data = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      description: true,
      images: true,
      createdAt: true,
      category: true,
      status: true,
    },
  });
  if (!data) notFound();
  return data;
}

export default async function ProjectPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = await getData(id);

  return (
    <main className="container mx-auto px-4 md:px-6 py-8 md:py-12">
      {/* Breadcrumbs */}
      <nav
        aria-label="Breadcrumb"
        className="mb-5 text-sm text-neutral-500"
      >
        <Link href="/portfolio/all" className="hover:text-neutral-800">Portfolio</Link>
        <span className="mx-2">/</span>
        <span className="text-neutral-900 font-medium">{data.name}</span>
      </nav>

      {/* 70/30 layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[68%_32%] gap-8 items-start">
        {/* Left: slider */}
        <div className="w-full">
            <ImageSlider images={data.images} mode="contain-blur" />
        </div>

        {/* Right: meta + actions */}
        <section className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight leading-tight">
              <span className="rounded-lg bg-amber-400/90 px-2 py-1 text-black [text-shadow:_0_1px_0_rgb(0_0_0_/_.12)]">
                {data.name}
              </span>
            </h1>

            <Link href="/portfolio/all" className="shrink-0" aria-label="Back to portfolio">
              <Button variant="outline" size="icon" className="border-black/10">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Rating */}
          <div className="mt-1 flex items-center gap-1" aria-label="Project rating 5 out of 5">
            {Array.from({ length: 5 }).map((_, i) => (
              <StarIcon key={i} className="h-4 w-4 text-amber-400 fill-amber-400" />
            ))}
          </div>

          {/* Meta badges */}
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {data.createdAt && (
              <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-1 text-neutral-700 ring-1 ring-black/5">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(data.createdAt).toLocaleDateString()}
              </span>
            )}
            {data.category && (
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 text-sky-800 px-2 py-1 ring-1 ring-sky-200">
                <Tag className="h-3.5 w-3.5" />
                {data.category}
              </span>
            )}
            {data.status && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-2 py-1 ring-1 ring-emerald-200">
                {data.status}
              </span>
            )}
          </div>

          {/* Description */}
          {data.description && (
            <p className="text-[15px] leading-relaxed text-neutral-700">
              {data.description}
            </p>
          )}

          {/* CTAs */}
          <div className="pt-1 flex flex-wrap gap-3">
            <Link href={`/quote?projectId=${data.id}`}>
              <Button size="lg" className="bg-amber-500 hover:bg-amber-600 text-black">
                Get a similar project
              </Button>
            </Link>
            <ShareButton title={data.name} />
          </div>
        </section>
      </div>

      {/* Related / Featured */}
      <section className="mt-16">
        <h2 className="mb-5 text-xl md:text-2xl font-extrabold tracking-tight">
          More featured work
        </h2>
        <FeaturedProject />
      </section>
    </main>
  );
}
