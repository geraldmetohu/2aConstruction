// app/componets/storefront/Hero/index.tsx (SERVER COMPONENT)
import { prisma } from "@/app/lib/db";
import { HeroClient } from "./HeroClient";


export async function Hero() {
// Prefer videos; fall back to existing banners if none
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


// Optional: keep your old image banner data as a fallback
const banners = videos.length
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


return <HeroClient videos={videos} bannersFallback={banners} />;
}