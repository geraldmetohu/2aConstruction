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

      {/* Local Business JSON-LD (SEO) */}
      <script
        type="application/ld+json"
        // update companyNo, vatID, telephone & url/logo paths
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            name: "2A Construction",
            image: "https://2aconstruction.co.uk/2a_l.png",
            url: "https://2aconstruction.co.uk",
            telephone: "+44 790 3095 967",
            address: {
              "@type": "PostalAddress",
              addressLocality: "London",
              addressCountry: "GB",
            },
            openingHoursSpecification: [
              {
                "@type": "OpeningHoursSpecification",
                dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
                opens: "08:00",
                closes: "18:00",
              },
              {
                "@type": "OpeningHoursSpecification",
                dayOfWeek: "Saturday",
                opens: "08:00",
                closes: "18:00",
              },
            ],
            priceRange: "££",
            sameAs: [
              "https://www.facebook.com/profile.php?id=100095250444954",
              "https://www.instagram.com/2a.construction.ltd/",
              "https://uk.linkedin.com/company/2a-construction-ltd",
            ],
          }),
        }}
      />
    </>
  );
  
}




