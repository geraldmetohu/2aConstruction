// app/componets/storefront/Hero/index.tsx
import { prisma } from "@/app/lib/db";
import { HeroClient } from "./HeroClient";

export type HeroSlide = {
  id: string;
  title?: string | null;
  subtitle?: string | null;
  videoUrl: string;
  ctaText?: string | null;
  ctaHref?: string | null;
  durationSec?: number;
};

export async function Hero() {
  // 1) Always show your two local MP4s first
  const localSlides: HeroSlide[] = [
    {
      id: "local-1",
      title: "",
      subtitle: "",
      videoUrl: "/videos/2a_hero.mp4",
      ctaText: "Get a Quote",
      ctaHref: "/contact",
      durationSec: 4,
    },
    {
      id: "local-2",
      title: "Quality Construction, Trusted Results",
      subtitle: "Extensions, lofts & refurbs — across London.",
      videoUrl: "/videos/2a_hero2.mp4",
      ctaText: "View Projects",
      ctaHref: "/portfolio/all",
      durationSec: 11,
    },
  ];

  // 2) Optionally append DB videos (no NOT filter needed)
  let dbSlides: HeroSlide[] = [];
  try {
    const rows = await prisma.heroVideo.findMany({
      where: { isActive: true },              // ← removed NOT: { videoUrl: null }
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        title: true,
        subtitle: true,
        videoUrl: true,                       // required by schema
        ctaText: true,
        ctaHref: true,
      },
    });

    dbSlides = (rows ?? []).map((r, i) => ({
      id: r.id,
      title: r.title ?? "",
      subtitle: r.subtitle ?? "",
      videoUrl: r.videoUrl,                   // always a string
      ctaText: r.ctaText ?? null,
      ctaHref: r.ctaHref ?? null,
      durationSec: 6 + (i % 3),               // 6–8s
    }));
  } catch {
    dbSlides = [];
  }

  const slides = [...localSlides, ...dbSlides];
  return <HeroClient videos={slides} />;
}
