// app/services/page.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Hammer,
  Ruler,
  PenTool,
  Home,
  Layers,
  Wrench,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { useRef } from "react";
import { motion, useScroll, useTransform, type Variants } from "framer-motion";

// Parent: staggers children
const containerStagger: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

// Child: slide up
const itemUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      // use cubic-bezier instead of "easeOut"
      ease: [0.16, 1, 0.3, 1], // standard "easeOut" curve
    },
  },
};

/** Brand palette (swap to your Tailwind tokens if you have them) */
const brand = {
  primary: "amber-500", // tailwind color name only
};


export default function ServicesPage() {
  const heroRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "12%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.9]);

  return (
    <div className="w-full">
      {/* HERO */}
      <section ref={heroRef} className="relative h-[38vh] md:h-[50vh] overflow-hidden text-white">
        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="absolute inset-0">
          <Image
            src="/roof.jpg"
            alt="Construction services in London"
            fill
            className="object-cover"
            priority
          />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/55 to-black/80" />
        <div className="relative z-10 h-full max-w-7xl mx-auto px-4 flex items-end pb-10">
          <div>
            <h1 className="text-3xl md:text-5xl font-extrabold leading-tight">
              Services built around your home
            </h1>
            <p className="mt-2 text-white/90">
              Extensions, lofts, refurbishments, and roofing — delivered on time and on budget.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/contact#quote"
                className="px-5 py-3 bg-amber-500 text-black font-medium rounded-md hover:opacity-90"
              >
                Request a Free Quote
              </Link>
              <Link
                href="/portfolio/all"
                className="px-5 py-3 border border-white/80 text-white font-medium rounded-md hover:bg-white/10"
              >
                View Projects
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICE CARDS */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight">What we do</h2>

          <motion.div
            variants={containerStagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5"
          >
            <ServiceCard
              icon={<Home className="h-6 w-6" />}
              title="House Extensions"
              blurb="Single and double-storey extensions, open-plan kitchens, RSJ installation, and structural works."
              href="/portfolio/extention"
              bullets={["Planning & design support", "Steelwork + foundations", "Building control sign-off"]}
              imageSrc="/extention.jpeg"
            />
            <ServiceCard
              icon={<Layers className="h-6 w-6" />}
              title="Loft Conversions"
              blurb="Dormer, hip-to-gable, mansard, and Velux conversions to add bedrooms, bathrooms, and storage."
              href="/portfolio/loft"
              bullets={["Stairs & layout optimisation", "Insulation & fire regs", "En-suite fit-outs"]}
              imageSrc="/loft.jpg"
            />
            <ServiceCard
              icon={<Wrench className="h-6 w-6" />}
              title="Refurbishments"
              blurb="Full interior renovations, reconfiguration, plastering, electrics, plumbing, kitchens and bathrooms."
              href="/portfolio/refurbishment"
              bullets={["Project management", "NICEIC & Gas Safe partners", "High-end finishes"]}
              imageSrc="/refurbishment.jpg"
            />
            <ServiceCard
              icon={<ShieldCheck className="h-6 w-6" />}
              title="Roofing"
              blurb="New roofs and repairs in slate, tile, and flat systems (GRP/EPDM), plus gutters and leadwork."
              href="/portfolio/roof"
              bullets={["New builds & re-roof", "Flat roofing systems", "Emergency repairs"]}
              imageSrc="/roof.jpg"
            />
          </motion.div>
        </div>
      </section>

      {/* FEATURED GALLERY (slides slightly on scroll) */}
      <FeaturedGallery
        items={[
          { src: "/extention.jpeg", alt: "Kitchen extension" },
          { src: "/loft.jpg", alt: "Loft conversion" },
          { src: "/refurbishment.jpg", alt: "Full refurbishment" },
          { src: "/roof.jpg", alt: "New roof" },
        ]}
      />

      {/* WHY US / PILLARS */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h3 className="text-2xl md:text-4xl font-extrabold tracking-tight">Why choose 2A Construction</h3>
          <motion.div
            variants={containerStagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            <Pillar
              icon={<Ruler className="h-6 w-6" />}
              title="Measured & organised"
              blurb="Clear scope, itemised quotes, and weekly updates from your dedicated project manager."
            />
            <Pillar
              icon={<PenTool className="h-6 w-6" />}
              title="Design to delivery"
              blurb="We collaborate with architects and handle approvals where needed to keep things moving."
            />
            <Pillar
              icon={<Hammer className="h-6 w-6" />}
              title="Craftsmanship"
              blurb="Trusted trades, compliant installs, and finishing detail we’re proud to hand over."
            />
          </motion.div>
        </div>
      </section>

      {/* PROCESS */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h3 className="text-2xl md:text-4xl font-extrabold tracking-tight">Our process</h3>
          <motion.div
            variants={containerStagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            className="mt-8 grid grid-cols-1 lg:grid-cols-4 gap-5"
          >
            <motion.div variants={itemUp}>
              <Step num="01" title="Site Visit & Quote" desc="We visit, measure, and provide a clear, itemised quotation." />
            </motion.div>
            <motion.div variants={itemUp}>
              <Step num="02" title="Design & Planning" desc="Architectural drawings and approvals if required." />
            </motion.div>
            <motion.div variants={itemUp}>
              <Step num="03" title="Build & Manage" desc="Dedicated PM, tidy site, weekly progress updates." />
            </motion.div>
            <motion.div variants={itemUp}>
              <Step num="04" title="Handover & Guarantee" desc="Snag-free delivery with long-term structural cover." />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h3 className="text-2xl md:text-4xl font-extrabold tracking-tight">FAQs</h3>
          <motion.div
            variants={containerStagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <motion.div variants={itemUp}>
              <FAQ
                q="How quickly can you start?"
                a="Typical lead time is 2–6 weeks depending on scope. We can often begin surveys and prep immediately."
              />
            </motion.div>
            <motion.div variants={itemUp}>
              <FAQ
                q="Do you help with planning and building control?"
                a="Yes. We coordinate with architects and handle building control sign-off as part of our service."
              />
            </motion.div>
            <motion.div variants={itemUp}>
              <FAQ
                q="Are you insured and accredited?"
                a="Yes. We are fully insured and work with accredited partners (NICEIC, Gas Safe). Structural work carries a 10-year guarantee."
              />
            </motion.div>
            <motion.div variants={itemUp}>
              <FAQ
                q="Can I see similar projects?"
                a="Absolutely — browse our portfolio or ask us for references near you."
                link={{ href: "/portfolio/all", label: "Browse projects" }}
              />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative isolate overflow-hidden py-16 bg-gradient-to-br from-amber-50 to-white">
        <div className="max-w-7xl mx-auto px-4 grid lg:grid-cols-2 gap-8 items-center">
          <div>
            <h3 className="text-2xl md:text-4xl font-extrabold tracking-tight">
              Ready to start? Book your free site visit.
            </h3>
            <p className="mt-3 text-neutral-700">
              We’ll assess, advise, and provide a clear, itemised quotation.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/contact#quote" className="px-5 py-3 bg-amber-500 text-black font-medium rounded-md hover:opacity-90">
                Request a Free Quote
              </Link>
              <Link href="/about" className="px-5 py-3 border border-amber-500/50 rounded-md font-medium hover:bg-amber-50 text-amber-700">
                About Us
              </Link>
            </div>
          </div>
          <div className="relative h-64 sm:h-80 lg:h-96 overflow-hidden rounded-lg">
            <Image src="/roof.jpg" alt="Team on site" fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent" />
          </div>
        </div>
      </section>
    </div>
  );
}

/* ---------- components ---------- */

function ServiceCard({
  icon,
  title,
  blurb,
  href,
  bullets,
  imageSrc,
}: {
  icon: React.ReactNode;
  title: string;
  blurb: string;
  href: string;
  bullets: string[];
  imageSrc: string;
}) {
  return (
    <motion.article
      variants={itemUp}
      className="group border border-amber-500/20 rounded-lg overflow-hidden bg-white hover:shadow-xl transition-shadow"
    >
      {/* Image with subtle parallax on hover */}
      <div className="relative h-40 w-full overflow-hidden">
        <motion.div
          whileHover={{ scale: 1.05, y: -4 }}
          transition={{ type: "spring", stiffness: 180, damping: 18 }}
          className="h-full w-full"
        >
          <Image src={imageSrc} alt={title} fill className="object-cover" />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-70 group-hover:opacity-60 transition-opacity" />
      </div>

      {/* Copy */}
      <div className="p-5">
        <div className="flex items-center gap-2 text-neutral-900">
          <span className="text-amber-500">{icon}</span>
          <h4 className="font-semibold">{title}</h4>
        </div>
        <p className="mt-2 text-neutral-600">{blurb}</p>
        <ul className="mt-3 space-y-1 text-sm text-neutral-700">
          {bullets.map((b) => (
            <li key={b} className="flex gap-2">
              <span className="text-amber-500">•</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <Link
          href={href}
          className="mt-4 inline-flex items-center gap-1 text-amber-600 font-medium hover:text-amber-700"
        >
          See examples <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </motion.article>
  );
}

function Pillar({ icon, title, blurb }: { icon: React.ReactNode; title: string; blurb: string }) {
  return (
    <motion.div
      variants={itemUp}
      className="p-6 bg-white border border-amber-500/20 rounded-lg"
    >
      <div className="flex items-center gap-2 text-neutral-900">
        <span className="text-amber-500">{icon}</span>
        <div className="font-semibold">{title}</div>
      </div>
      <p className="mt-3 text-neutral-600">{blurb}</p>
    </motion.div>
  );
}

function Step({ num, title, desc }: { num: string; title: string; desc: string }) {
  return (
    <div className="p-5 border border-amber-500/20 rounded-lg hover:shadow-lg transition-shadow bg-white">
      <div className="inline-flex items-center gap-2">
        <span className="px-2 py-1 text-xs font-semibold text-black bg-amber-500 rounded">{num}</span>
      </div>
      <div className="mt-2 font-semibold text-neutral-900">{title}</div>
      <div className="mt-1 text-sm text-neutral-600">{desc}</div>
    </div>
  );
}

function FAQ({
  q,
  a,
  link,
}: {
  q: string;
  a: string;
  link?: { href: string; label: string };
}) {
  return (
    <div className="p-5 bg-white border border-amber-500/20 rounded-lg">
      <div className="font-semibold text-neutral-900">{q}</div>
      <p className="mt-2 text-neutral-600">{a}</p>
      {link && (
        <Link
          href={link.href}
          className="mt-3 inline-flex items-center gap-1 text-amber-600 hover:text-amber-700"
        >
          {link.label} <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

/** Featured gallery with subtle scroll motion */
function FeaturedGallery({
  items,
}: {
  items: { src: string; alt: string }[];
}) {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: rowRef,
    offset: ["start end", "end start"],
  });
  const translate = useTransform(scrollYProgress, [0, 1], ["-2%", "2%"]);

  return (
    <section className="py-12 bg-black text-white">
      <div className="max-w-7xl mx-auto px-4">
        <h3 className="text-xl md:text-2xl font-extrabold tracking-tight">
          Recent work snapshots
        </h3>
        <motion.div
          ref={rowRef}
          style={{ x: translate }}
          className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
        >
          {items.map((it, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45 }}
              className="relative h-28 sm:h-32 lg:h-36 rounded-md overflow-hidden"
            >
              <Image src={it.src} alt={it.alt} fill className="object-cover" />
              <div className="absolute inset-0 bg-black/10" />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
