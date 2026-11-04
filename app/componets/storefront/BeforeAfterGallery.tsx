// SERVER COMPONENT
import { prisma } from "@/app/lib/db";
import { storefrontQuery } from "@/app/lib/storefront-query";
import { BeforeAfterCarousel } from "./BeforeAfterCarusel";

export async function BeforeAfterGallery() {
  const items = await storefrontQuery("Before and after gallery", () => prisma.beforeAfter.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, imageStringBefore: true, imageStringAfter: true },
  }));

  if (!items.length) return null;
  return <BeforeAfterCarousel items={items} />;
}
