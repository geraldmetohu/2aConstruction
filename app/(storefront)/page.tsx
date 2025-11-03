// app/(storefront)/page.tsx
import Image from "next/image";
import Link from "next/link";
// app/(storefront)/page.tsx
import { ServicesOverview } from "../componets/storefront/ServicesOverview";

import { FeaturedProject } from "../componets/storefront/FeaturedProject";
import { AnimatedCategorySelection } from "../componets/storefront/AnimatedCategorySelection";
import { ProofBar } from "../componets/storefront/StatsBar";
import { ProcessSection } from "../componets/storefront/ProcessSection";
import { CTAQuote } from "../componets/storefront/CTAQuote";
import { StickyContactBar } from "../componets/storefront/StickyContactBar";
import { BeforeAfterGallery } from "../componets/dashboard/BeforeAfterGallery";
import { Reveal, RevealStagger } from "@/components/ui/Reveal";
import { Hero } from "../componets/storefront/Hero";

// 👇 client-side reveal wrappers (small client component)
// file: app/components/ui/Reveal.tsx (added separately)

export default function IndexPage() {
  const year = new Date().getFullYear();

  return (
    <>
      <Hero />

      {/* Services overview (fast paths) */}
      <RevealStagger>
        <ServicesOverview />
      </RevealStagger>

      <Reveal>
        <AnimatedCategorySelection />
      </Reveal>

      <Reveal>
        <ProofBar
          pillars={[
            { title: "Free Site Visit", blurb: "We assess & advise before quoting.", icon: "📝" },
            { title: "Fixed-Price Quote", blurb: "Transparent scope—no surprises.", icon: "📦" },
            { title: "Clear Schedule", blurb: "Start/finish dates agreed.", icon: "📅" },
            { title: "Clean & Tidy", blurb: "Daily protection & final clean.", icon: "🧹" },
          ]}
        />
      </Reveal>

      {/* Latest work (scroll-snap gallery) */}
      <Reveal>
        <LatestWorkStrip
          items={[
            { src: "/images/ext.jpeg", alt: "Kitchen extension" },
            { src: "/images/loft.jpg", alt: "Loft conversion" },
            { src: "/images/refurb.jpg", alt: "Full refurb" },
            { src: "/images/roof.jpg", alt: "New roof" },
            { src: "/images/ext.jpeg", alt: "Rear extension" },
            { src: "/images/loft.jpg", alt: "Dormer conversion" },
          ]}
        />
      </Reveal>

      <Reveal>
        <BeforeAfterGallery />
      </Reveal>

      <Reveal>
        <FeaturedProject />
      </Reveal>

      <Reveal>
        <ProcessSection />
      </Reveal>

      {/* Social proof */}
      <Reveal>
        <Testimonials />
      </Reveal>

      {/* Mini FAQ */}
      <Reveal>
        <HomeFAQ />
      </Reveal>

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
            image: "https://your-domain.com/2a_l.png",
            url: "https://your-domain.com/",
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
                opens: "09:00",
                closes: "14:00",
              },
            ],
            priceRange: "££",
            sameAs: [
              "https://facebook.com/",
              "https://twitter.com/",
              "https://www.instagram.com/",
              "https://www.linkedin.com/",
            ],
          }),
        }}
      />
    </>
  );
}


function LatestWorkStrip({ items }: { items: { src: string; alt: string }[] }) {
  return (
    <section className="py-10 bg-black text-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-end justify-between">
          <h3 className="text-xl md:text-2xl font-extrabold">Recent work snapshots</h3>
          <span className="text-sm text-white/70">Swipe →</span>
        </div>

        {/* Scroll-snap row (no JS) */}
        <div className="mt-5 overflow-x-auto no-scrollbar">
          <div className="flex gap-4 snap-x snap-mandatory">
            {items.map((it, i) => (
              <figure
                key={`${it.alt}-${i}`}
                className="relative h-40 w-[70vw] sm:w-[40vw] md:w-[28vw] lg:w-[22vw] rounded-lg overflow-hidden snap-start shrink-0"
              >
                <Image src={it.src} alt={it.alt} fill className="object-cover" />
                <figcaption className="absolute bottom-0 left-0 right-0 px-3 py-2 text-xs bg-black/50">
                  {it.alt}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const items = [
    {
      quote:
        "Brilliant communication and finish. The extension was delivered exactly as quoted and the site was kept tidy throughout.",
      name: "S. Patel, Croydon",
    },
    {
      quote:
        "Loft conversion completed ahead of schedule. Team was courteous and the project manager kept us updated weekly.",
      name: "A. Thompson, Barnet",
    },
    {
      quote:
        "Full refurb with new kitchen & bathrooms. Quality workmanship and zero snags at handover.",
      name: "M. Rossi, Walthamstow",
    },
  ];

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <h3 className="text-2xl md:text-4xl font-extrabold tracking-tight">What clients say</h3>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5">
          {items.map((t) => (
            <blockquote
              key={t.name}
              className="p-6 rounded-lg border border-amber-500/20 bg-white"
            >
              <p className="text-neutral-800">“{t.quote}”</p>
              <footer className="mt-4 text-sm text-neutral-600">— {t.name}</footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}

function HomeFAQ() {
  const qs = [
    {
      q: "How soon can you start?",
      a: "Small works can start within weeks; larger projects are typically scheduled 4–8 weeks ahead after approvals.",
    },
    {
      q: "Do you handle planning & building control?",
      a: "Yes. We coordinate drawings, structural calcs, applications and inspections with a single point of contact.",
    },
    {
      q: "What guarantees do you provide?",
      a: "10-year structural guarantee as standard. Manufacturer warranties apply to materials.",
    },
  ];

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <h3 className="text-2xl md:text-4xl font-extrabold tracking-tight">FAQs</h3>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5">
          {qs.map((f) => (
            <div key={f.q} className="p-6 rounded-lg border border-amber-500/20 bg-white">
              <div className="font-semibold text-neutral-900">{f.q}</div>
              <p className="mt-2 text-neutral-600">{f.a}</p>
              <Link
                href="/contact#quote"
                className="mt-3 inline-block text-amber-700 hover:text-amber-800 font-medium"
              >
                Ask a question →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
