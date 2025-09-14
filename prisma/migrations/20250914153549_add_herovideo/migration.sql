-- CreateTable
CREATE TABLE "HeroVideo" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "videoUrl" TEXT NOT NULL,
    "posterUrl" TEXT,
    "ctaText" TEXT,
    "ctaHref" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HeroVideo_pkey" PRIMARY KEY ("id")
);
