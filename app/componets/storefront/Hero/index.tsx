import { prisma } from "@/lib/prisma";
import HeroClient, {
  type HeroSlide,
} from "./HeroClient";

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
    subtitle:
      "Extensions, lofts & refurbs — across London.",
    videoUrl: "/videos/2a_hero2.mp4",
    ctaText: "View Projects",
    ctaHref: "/portfolio/all",
    durationSec: 11,
  },
];

export default async function Hero() {
  let databaseSlides: HeroSlide[] = [];

  try {
    const videos = await prisma.heroVideo.findMany({
      where: {
        active: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 8,
    });

    databaseSlides = videos.map((video) => ({
      id: String(video.id),
      title: video.title ?? "",
      subtitle: video.subtitle ?? "",
      videoUrl: video.videoUrl,
      ctaText: video.ctaText ?? "View Projects",
      ctaHref: video.ctaHref ?? "/portfolio/all",
      durationSec: Math.min(
        Math.max(video.durationSec ?? 7, 6),
        8
      ),
    }));
  } catch (error) {
    console.error(
      "Failed to load hero videos:",
      error
    );
  }

  /*
   * Local slides are always available.
   * Database slides are added after them.
   */
  const slides = [
    ...localSlides,
    ...databaseSlides,
  ];

  return <HeroClient videos={slides} />;
}