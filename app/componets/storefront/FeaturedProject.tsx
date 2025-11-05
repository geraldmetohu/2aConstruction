// app/componets/storefront/FeaturedProject.tsx
import { prisma } from "@/app/lib/db";
import Link from "next/link";
import { Suspense } from "react";
import { ProjectCard, LoadingProjectCart } from "./ProjectCard";
import { GridStagger, ItemFade } from "./GridStagger";

async function getFeaturedRows() {
  return prisma.project.findMany({
    where: { status: "published", isFeatured: true },
    select: { id: true, name: true, description: true, images: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 3,
  });
}

export async function FeaturedProject() {
  const rows = await getFeaturedRows();

  return (
    <section className="container mx-auto px-4 md:px-6 py-10 md:py-12">
      <div className="mb-6 md:mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs tracking-wide text-amber-700 border-amber-500/30 bg-amber-50">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
            Featured
          </div>
          <h2 className="mt-3 text-2xl md:text-3xl font-extrabold tracking-tight">
            Featured Projects
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A quick look at some recent work across extensions, lofts and refurbishments.
          </p>
        </div>

        <Link
          href="/portfolio/all"
          className="text-sm font-medium text-amber-700 hover:text-amber-800 underline-offset-4 hover:underline"
        >
          View all projects →
        </Link>
      </div>

      <div className="mt-6 md:mt-8">
        <Suspense
          fallback={
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <LoadingProjectCart />
              <LoadingProjectCart />
              <LoadingProjectCart />
            </div>
          }
        >
          <LoadFeaturedGrid initial={rows} />
        </Suspense>
      </div>
    </section>
  );
}

async function LoadFeaturedGrid({ initial }: { initial: Awaited<ReturnType<typeof getFeaturedRows>> }) {
  const data = initial ?? (await getFeaturedRows());

  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border p-10 text-center text-muted-foreground">
        No featured projects yet. Check back soon.
      </div>
    );
  }

  return (
    <GridStagger>
      {data.map((item) => (
        <ItemFade key={item.id}>
          {/* Use cover variant so it shows the oldest image (images[0]) */}
          <ProjectCard item={item} variant="cover" />
        </ItemFade>
      ))}
    </GridStagger>
  );
}
