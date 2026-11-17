import { prisma } from "@/app/lib/db";
import { storefrontQuery } from "@/app/lib/storefront-query";
import HeroClient, {
  type HeroSlide,
} from "./HeroClient";

/** The hero videos come in three sizes (re-encoded from the 4K originals, which stay in public/videos). */
const sized = (name: string) => ({
  sources: [
    { src: `/videos/${name}-1080.mp4`, media: "(min-width: 1440px)" },
    { src: `/videos/${name}-480.mp4`, media: "(max-width: 640px)" },
    { src: `/videos/${name}-720.mp4` },
  ],
  poster: `/videos/${name}-poster.webp`,
});

const localSlides: HeroSlide[] = [
  {
    id: "local-1",
    title: "",
    subtitle: "",
    videoUrl: "/videos/2a_hero.mp4",
    ...sized("2a_hero"),
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
    ...sized("2a_hero2"),
    ctaText: "View Projects",
    ctaHref: "/portfolio/all",
    durationSec: 11,
  },
];

export default async function Hero() {
  const videos = await storefrontQuery("Hero videos", () => prisma.heroVideo.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 8,
  }));

  const databaseSlides: HeroSlide[] = videos.map((video) => ({
    id: String(video.id),
    title: video.title ?? "",
    subtitle: video.subtitle ?? "",
    videoUrl: video.videoUrl,
    ctaText: video.ctaText ?? "View Projects",
    ctaHref: video.ctaHref ?? "/portfolio/all",
    durationSec: 7,
    poster: video.posterUrl ?? undefined,
  }));

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
