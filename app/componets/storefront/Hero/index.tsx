// app/componets/storefront/Hero/index.tsx
import { prisma } from "@/app/lib/db";
import { HeroClient } from "./HeroClient";

/**
 * This version supports:
 *  - Fetching from DB (heroVideo table)
 *  - Falling back to local or remote sample videos
 */
export async function Hero() {
  // Try to load from DB first
  const videos = await prisma.heroVideo.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      title: true,
      subtitle: true,
      videoUrl: true,
      posterUrl: true,
      ctaText: true,
      ctaHref: true,
      createdAt: true,
    },
  });

  // ✅ Fallback: sample videos (both local and URL)
  const fallbackVideos = [
    // --- Local video example (put in /public/videos/)
    {
      id: "local-1",
      title: "Transform Your Space",
      subtitle: "Extensions, lofts & refurbs — across London.",
      videoUrl: "/videos/2a_hero.mp4", // local file
      posterUrl: "/posters/hero1.jpg",
      ctaText: "Get a Quote",
      ctaHref: "/contact",
      createdAt: new Date(),
    },
    // --- External URL example (free from Pexels / Pixabay)
    {
      id: "url-1",
      title: "Quality Construction, Trusted Results",
      subtitle: "Building excellence in every brick.",
      videoUrl:
        "https://videos.pexels.com/video-files/857195/857195-hd_1920_1080_30fps.mp4", // external MP4
      posterUrl:
        "https://images.pexels.com/photos/257897/pexels-photo-257897.jpeg?auto=compress&cs=tinysrgb&w=1200",
      ctaText: "View Projects",
      ctaHref: "/portfolio/all",
      createdAt: new Date(),
    },
  ];

  // ✅ Optional fallback banners (if even videos fail)
  const banners =
    videos.length > 0
      ? []
      : await prisma.banner.findMany({
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            title: true,
            subtitle: true,
            ctaText: true,
            ctaHref: true,
            imageString: true,
          },
        });

  // Return whichever source is available
  const source = videos.length > 0 ? videos : fallbackVideos;

  return (
    <HeroClient
      videos={source}
      bannersFallback={banners}
      showCanvas
      canvasPreset="sparks"
    />
  );
}
