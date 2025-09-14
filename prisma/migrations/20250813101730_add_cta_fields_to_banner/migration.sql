-- AlterTable
ALTER TABLE "Banner" ADD COLUMN     "ctaHref" TEXT,
ADD COLUMN     "ctaText" TEXT,
ALTER COLUMN "subtitle" DROP NOT NULL;
