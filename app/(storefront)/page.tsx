// app/(storefront)/page.tsx
import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
// app/(storefront)/page.tsx
import { FeaturedProject } from "../componets/storefront/FeaturedProject";
import { InteractiveProof } from "../componets/storefront/StatsBar";
import { ProcessLifeline } from "../componets/storefront/ProcessSection";
import { CTAQuote } from "../componets/storefront/CTAQuote";
import { StickyContactBar } from "../componets/storefront/StickyContactBar";
import { BeforeAfterGallery } from "../componets/storefront/BeforeAfterGallery";
import { Reveal, RevealStagger } from "@/components/ui/Reveal";

import { ReviewsWidgets } from "../componets/storefront/ReviewsWidgets";
import { EstimatorOverview } from "../componets/storefront/EstimatorOverview";
import Hero from "../componets/storefront/Hero";
import { TrustSection } from "../componets/storefront/TrustSection";
import { BuildSequence } from "../componets/storefront/site/BuildSequence";
import CurvedNavy from "../componets/storefront/CurvedNavy";
import CurvedNavyInverted from "../componets/storefront/CurvedNavyInverted";
import { ServicesPortfolio } from "../componets/storefront/ServicesPortfolio";
import { ProjectProcess } from "../componets/storefront/ProjectProcess";
import CurvedBlack from "../componets/storefront/CurvedBlack";
import Testimonials from "../componets/storefront/Testimonials";

// 👇 client-side reveal wrappers (small client component)
// file: app/components/ui/Reveal.tsx (added separately)
export const dynamic = "force-dynamic";

export default function IndexPage() {
  const year = new Date().getFullYear();

  return (
    <>
      <Hero/>
      {/* SAFE CONTRACTOR – TRUST SECTION */}
      <TrustSection />
      <Reveal>
        <EstimatorOverview />
      </Reveal>
      <CurvedNavy/>
      <ServicesPortfolio />
      <CurvedNavyInverted/>
      
      <Reveal>
        <CurvedBlack/>
        <ProjectProcess
          beforeAfter={{
          before: "/images/refurb.jpg",
          after: "/images/ext.jpeg",
            }}
        />
      </Reveal>
    
      {/* How a build comes together: the scroll-driven section drawing */}
      <section className="border-y-2 border-[#071a33] bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-6 px-5 py-12 sm:px-8 lg:px-10">
          <div>
            <h2 className="text-3xl font-semibold tracking-[-0.03em] text-[#071a33] md:text-5xl">How a build comes together</h2>
            <p className="mt-3 max-w-2xl text-lg text-[#071a33]/70">A rear extension with a loft dormer, drawn in section. Keep scrolling and watch it go up, from the survey to the lights coming on.</p>
          </div>
        </div>
      </section>
      <BuildSequence />

      <Reveal>
        <FeaturedProject />
      </Reveal>
      <Reveal>
        <Testimonials />
      </Reveal>

      <Reveal>
        <BeforeAfterGallery />
      </Reveal>

      {/* Mini FAQ */}


      <Reveal>
        <CTAQuote />
      </Reveal>

      <StickyContactBar />

      {/* Business details for search engines are in the root layout (one source of truth). */}
    </>
  );
  
}




