import { prisma } from "@/app/lib/db";
import { notFound } from "next/navigation";
import { ProjectCard } from "@/app/componets/storefront/ProjectCard";
import { CategoryIntro } from "@/app/componets/storefront/CategoryIntro";
import { GridStagger, ItemFade } from "@/app/componets/storefront/GridStagger";

type Category = "all" | "general" | "refurbishment" | "loft" | "extention" | "roof";

const CATEGORY_META: Record<Category, { title: string; blurb: string; image: string }> = {
  all: {
    title: "All Projects",
    blurb:
      "Explore our latest extensions, loft conversions, refurbishments and roofing projects across London. Every build is delivered with quality, communication and tidy sites.",
    image: "/images/hero-all.jpg",
  },
  general: {
    title: "General Building",
    blurb:
      "From structural works to clean finishes—our general building team delivers reliable workmanship and tidy sites.",
    image: "/images/hero-all.jpg",
  },
  refurbishment: {
    title: "Refurbishment Projects",
    blurb:
      "From single-room revamps to full-house refurbishments—clean finishes, reliable scheduling and attention to detail are our baseline.",
    image: "/images/refurb.jpg",
  },
  loft: {
    title: "Loft Conversions",
    blurb:
      "Create new bedrooms, bathrooms and storage in the space you already own. Dormers, hip-to-gable and skylight conversions delivered end-to-end.",
    image: "/images/loft.jpg",
  },
  extention: {
    title: "House Extensions",
    blurb:
      "Rear, side-return and wraparound extensions that open up your home to light and space. We coordinate drawings, structure and building control.",
    image: "/images/ext.jpeg",
  },
  roof: {
    title: "Roofing Projects",
    blurb:
      "Pitched and flat roofing, insulation upgrades, re-tiling and repairs. Durable roofs with clean detailing and warranties.",
    image: "/images/roof.jpg",
  },
};

const VALID: Category[] = ["all", "general", "refurbishment", "loft", "extention", "roof"];

async function getRows(category: Category) {
  const baseSelect = { id: true, name: true, images: true, description: true } as const;

  if (category === "all") {
    return prisma.project.findMany({
      select: baseSelect,
      where: { status: "published" },
      orderBy: { createdAt: "desc" },
    });
  }

  return prisma.project.findMany({
    select: baseSelect,
    where: { status: "published", category },
    orderBy: { createdAt: "desc" },
  });
}

export default async function CategoryPage({ params }: { params: { name: string } }){
  const name = params.name?.toLowerCase() as Category;
  if (!VALID.includes(name)) notFound();

  const meta = CATEGORY_META[name];
  const rows = await getRows(name);

  return (
    <main className="container mx-auto px-4 md:px-6 py-8 md:py-12">
      <CategoryIntro title={meta.title} blurb={meta.blurb} image={meta.image} />

      <section className="mt-8 md:mt-12">
        {rows.length === 0 ? (
          <div className="rounded-xl border p-10 text-center text-muted-foreground">
            No projects in this category yet. Check back soon.
          </div>
        ) : (
          <GridStagger>
            {rows.map((item) => (
              <ItemFade key={item.id}>
                <ProjectCard item={item} />
              </ItemFade>
            ))}
          </GridStagger>
        )}
      </section>
    </main>
  );
}
