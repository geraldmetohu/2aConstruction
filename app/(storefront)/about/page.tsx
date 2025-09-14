"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  CheckCircle2,
  Hammer,
  Ruler,
  ShieldCheck,
  Home,
  Building2,
  Clock,
  PhoneCall,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

/** Brand tokens (feel free to centralise later) */
const brand = {
  primary: "bg-amber-500",
  primaryText: "text-amber-500",
  primaryRing: "ring-amber-500/30",
  border: "border-amber-500/25",
};

export default function AboutUs() {
  // Parallax hero
  const heroRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.85]);

  return (
    <div className="w-full">
      {/* HERO */}
      <section ref={heroRef} className="relative h-[64vh] lg:h-[80vh] overflow-hidden">
        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="absolute inset-0">
          <Image src="/roof.jpg" alt="2A Construction — London build in progress" fill className="object-cover" priority />
        </motion.div>

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/80" />

        <div className="relative z-10 h-full max-w-7xl mx-auto px-4 flex items-center">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="text-white text-3xl md:text-5xl lg:text-6xl font-extrabold leading-tight"
            >
              Building Quality, <span className="text-amber-400">Earning Trust</span>.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: "easeOut", delay: 0.12 }}
              className="mt-4 max-w-2xl text-white/85 text-base md:text-lg"
            >
              Extensions, lofts, refurbishments, and roofing across London — on time, on budget, and with finish you’ll be proud of.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.22 }}
              className="mt-6 flex flex-wrap gap-3"
            >
              <Link
                href="/contact#quote"
                className="px-5 py-3 bg-amber-500 text-black font-medium rounded-md hover:opacity-90 transition"
              >
                Request a Free Quote
              </Link>
              <Link
                href="/portfolio/all"
                className="px-5 py-3 border border-white/80 text-white font-medium rounded-md hover:bg-white/10 transition"
              >
                View Our Projects
              </Link>
            </motion.div>

            {/* Trust mini-strip */}
            <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-white/80">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-amber-400" />
                Fully insured
              </span>
              <span className="inline-flex items-center gap-2">
                <Hammer className="h-4 w-4 text-amber-400" />
                CHAS / SafeContractor
              </span>
              <span className="inline-flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                4.9/5 client reviews
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* INTRO */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 grid lg:grid-cols-2 gap-10 items-center">
          <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.55 }}>
            <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight">Who We Are</h2>
            <p className="mt-4 text-gray-700 leading-relaxed">
              2A Construction is a London-based team of builders, project managers, and specialist trades. From concept to completion, we combine
              planning, craftsmanship, and clear communication to keep your project smooth and stress-free.
            </p>
            <ul className="mt-6 space-y-2 text-gray-800">
              <LiCheck>Fully insured & compliant with UK regulations</LiCheck>
              <LiCheck>Dedicated project management & weekly progress updates</LiCheck>
              <LiCheck>10-year structural guarantee and aftercare</LiCheck>
            </ul>

            {/* Quick contact strip */}
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/contact#quote" className="px-4 py-2 rounded-md bg-amber-500 text-black font-medium hover:opacity-90 transition">
                <span className="inline-flex items-center gap-2">
                  <PhoneCall className="h-4 w-4" />
                  Book a site visit
                </span>
              </Link>
              <Link href="/services" className="px-4 py-2 rounded-md border border-amber-500/40 text-amber-700 hover:bg-amber-50 transition">
                Explore services
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.55 }}
            className="relative h-72 md:h-96 w-full overflow-hidden rounded-lg"
          >
            <Image src="/roof.jpg" alt="Our team on site" fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent" />
          </motion.div>
        </div>
      </section>

      {/* TRUST MARQUEE */}
      <LogosMarquee logos={[
        { src: "/cert-chas.png", alt: "CHAS" },
        { src: "/cert-safecontractor.png", alt: "SafeContractor" },
        { src: "/cert-niceic.png", alt: "NICEIC" },
        { src: "/cert-gassafe.png", alt: "Gas Safe" },
      ]} />

      {/* STATS */}
      <StatsStrip
        items={[
          { k: "Projects Completed", v: 240 },
          { k: "Years Experience", v: 12 },
          { k: "Avg. Review", v: 4.9, suffix: "/5" },
          { k: "Trusted Trades & Partners", v: 18 },
        ]}
      />

      {/* VALUES */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h3 className="text-2xl md:text-4xl font-extrabold tracking-tight">Our Values</h3>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <ValueCard icon={<ShieldCheck className="h-6 w-6" />} title="Integrity" blurb="Honest pricing, clear timelines, accountable delivery." />
            <ValueCard icon={<Ruler className="h-6 w-6" />} title="Precision" blurb="Measured planning and meticulous detailing at every stage." />
            <ValueCard icon={<Hammer className="h-6 w-6" />} title="Excellence" blurb="Quality materials, trusted trades, and proud handovers." />
          </div>
        </div>
      </section>

      {/* PROCESS (with line) */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h3 className="text-2xl md:text-4xl font-extrabold tracking-tight">From Idea to Handover</h3>
          <div className="relative mt-10">
            <div className="absolute left-0 right-0 top-9 hidden lg:block h-0.5 bg-amber-500/30" />
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 relative">
              <StepCard num="01" title="Site Visit & Quote" desc="We measure, discuss scope, and provide a clear itemised quote." />
              <StepCard num="02" title="Design & Planning" desc="Architectural drawings and approvals where required." />
              <StepCard num="03" title="Build & Manage" desc="Dedicated PM, weekly updates, tidy site and milestones." />
              <StepCard num="04" title="Handover & Guarantee" desc="Snag-free completion and long-term structural guarantee." />
            </div>
          </div>
          <div className="mt-6">
            <Link href="/services" className="inline-block text-amber-600 hover:text-amber-700 font-medium">
              Explore our services →
            </Link>
          </div>
        </div>
      </section>

      {/* TEAM */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h3 className="text-2xl md:text-4xl font-extrabold tracking-tight">Meet the Team</h3>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-4 gap-6">
            <TeamCard src="/roof.jpg" name="Alex" role="Director & Project Manager" />
            <TeamCard src="/roof.jpg" name="Kolin" role="Site Manager" />
            <TeamCard src="/roof.jpg" name="Angelo" role="Architect" />
            <TeamCard src="/roof.jpg" name="Gerald" role="Operations Lead" />
          </div>

          {/* Micro-credibility points */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Pill icon={<Building2 className="h-4 w-4" />}>Domestic specialists</Pill>
            <Pill icon={<Clock className="h-4 w-4" />}>On-time delivery culture</Pill>
            <Pill icon={<ShieldCheck className="h-4 w-4" />}>H&S first, always</Pill>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <FAQSection
        items={[
          {
            q: "How soon can you start?",
            a: "After a site visit and quote approval, we agree a start date based on scope, lead times, and planning conditions. Small works can start within weeks; larger projects typically schedule 4–8 weeks ahead.",
          },
          {
            q: "Do you handle planning and building control?",
            a: "Yes. We coordinate drawings, structural calcs, submissions, and inspections. You’ll have a single point of contact throughout.",
          },
          {
            q: "What guarantees do you offer?",
            a: "We provide a 10-year structural guarantee. Manufacturer warranties apply to materials as standard.",
          },
        ]}
      />

      {/* CTA */}
      <section className="relative isolate overflow-hidden py-16 bg-gradient-to-br from-amber-50 to-white">
        <div className="max-w-7xl mx-auto px-4 grid lg:grid-cols-2 gap-8 items-center">
          <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.5 }}>
            <h3 className="text-2xl md:text-4xl font-extrabold tracking-tight">Let’s plan your project.</h3>
            <p className="mt-3 text-gray-700">Book a free site visit and get a detailed, no-obligation quote within days.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/contact#quote" className="px-5 py-3 bg-amber-500 text-black font-medium rounded-md hover:opacity-90 transition">
                Request a Free Quote
              </Link>
              <Link href="/portfolio/all" className="px-5 py-3 border border-amber-500/50 rounded-md font-medium hover:bg-amber-50 text-amber-700 transition">
                View Our Projects
              </Link>
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-700">
              <span>✅ Fully insured</span>
              <span>🏆 CHAS / SafeContractor</span>
              <span>⭐ 4.9/5 reviews</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.55 }}
            className="relative h-64 sm:h-80 lg:h-96 overflow-hidden rounded-lg"
          >
            <Image src="/roof.jpg" alt="Completed extension exterior" fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent" />
          </motion.div>
        </div>
      </section>
    </div>
  );
}

/* ---------- Small Components ---------- */

function LiCheck({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <CheckCircle2 className="mt-0.5 h-5 w-5 text-amber-500" />
      <span>{children}</span>
    </li>
  );
}

function ValueCard({ icon, title, blurb }: { icon: React.ReactNode; title: string; blurb: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45 }}
      className={`p-6 bg-white border ${brand.border} rounded-lg`}
    >
      <div className="flex items-center gap-2 text-gray-900">
        <span className="text-amber-500">{icon}</span>
        <div className="font-semibold">{title}</div>
      </div>
      <p className="mt-3 text-gray-600">{blurb}</p>
    </motion.div>
  );
}

function StepCard({ num, title, desc }: { num: string; title: string; desc: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45 }}
      className={`p-5 border ${brand.border} hover:shadow-lg transition-shadow rounded-lg bg-white`}
    >
      <div className="inline-flex items-center gap-2">
        <span className="px-2 py-1 text-xs font-semibold text-black bg-amber-500 rounded">{num}</span>
        <Home className="h-4 w-4 text-gray-500" />
      </div>
      <div className="mt-2 font-semibold text-gray-900">{title}</div>
      <div className="mt-1 text-sm text-gray-600">{desc}</div>
    </motion.div>
  );
}

function CertLogo({ src, alt }: { src: string; alt: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.4 }}
      className="relative h-8 w-32 md:h-10 md:w-36 opacity-80"
    >
      <Image src={src} alt={alt} fill className="object-contain" />
    </motion.div>
  );
}

type Stat = { k: string; v: number; suffix?: string };
function StatsStrip({ items }: { items: Stat[] }) {
  const [vals, setVals] = useState(items.map(() => 0));
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          const start = performance.now();
          const dur = 1100;
          let raf = 0;
          const loop = (t: number) => {
            const p = Math.min(1, (t - start) / dur);
            const eased = 1 - Math.pow(1 - p, 3);
            setVals(items.map((s) => (Number.isInteger(s.v) ? Math.round(s.v * eased) : Math.round(s.v * eased * 10) / 10)));
            if (p < 1) raf = requestAnimationFrame(loop);
          };
          raf = requestAnimationFrame(loop);
          return () => cancelAnimationFrame(raf);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, [items]);

  return (
    <section className="bg-black text-white py-12">
      <div ref={ref} className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-10 text-center">
        {items.map((s, i) => (
          <div key={s.k}>
            <div className="text-4xl font-extrabold text-amber-400">
              {vals[i]}
              {s.suffix ?? ""}
            </div>
            <div className="mt-2 text-sm text-white/80">{s.k}</div>
            <div className="mx-auto mt-3 h-1 w-10 bg-amber-500/40" />
          </div>
        ))}
      </div>
    </section>
  );
}

type TeamCardProps = { src: string; name: string; role: string };
export function TeamCard({ src, name, role }: TeamCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45 }}
      className="group relative bg-white border border-amber-500/20 hover:shadow-lg transition-shadow overflow-hidden rounded-lg"
    >
      {/* Image */}
      <div className="relative h-64 w-full overflow-hidden">
        <Image src={src} alt={name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
      </div>
      {/* Info */}
      <div className="p-5 text-center">
        <h4 className="text-lg font-semibold text-gray-900">{name}</h4>
        <p className="text-gray-600 text-sm">{role}</p>
      </div>
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
    </motion.div>
  );
}

function Pill({ children, icon }: { children: React.ReactNode; icon: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-amber-500/30 text-amber-700 bg-amber-50">
      <span>{icon}</span>
      <span className="text-sm font-medium">{children}</span>
    </div>
  );
}

/* --- Logos Marquee (pure CSS) --- */
function LogosMarquee({ logos }: { logos: { src: string; alt: string }[] }) {
  const doubled = useMemo(() => [...logos, ...logos], [logos]);
  return (
    <section className="py-10 border-y border-amber-500/20 bg-white">
      <div className="overflow-hidden">
        <div className="flex gap-10 animate-marquee whitespace-nowrap">
          {doubled.map((l, i) => (
            <CertLogo key={`${l.alt}-${i}`} src={l.src} alt={l.alt} />
          ))}
        </div>
      </div>
      {/* Tailwind keyframes via arbitrary plugin? If not, inline style fallback: */}
      <style jsx>{`
        .animate-marquee {
          animation: marquee 22s linear infinite;
        }
        @keyframes marquee {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </section>
  );
}

/* --- FAQ --- */
function FAQSection({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="py-16 bg-white">
      <div className="max-w-3xl mx-auto px-4">
        <h3 className="text-2xl md:text-4xl font-extrabold tracking-tight text-center">FAQs</h3>
        <div className="mt-8 divide-y divide-amber-500/20 border border-amber-500/20 rounded-lg">
          {items.map((it, i) => {
            const expanded = open === i;
            return (
              <div key={i} className="p-4">
                <button
                  onClick={() => setOpen(expanded ? null : i)}
                  className="w-full flex items-center justify-between text-left"
                  aria-expanded={expanded}
                >
                  <span className="font-medium text-gray-900">{it.q}</span>
                  <ChevronDown className={`h-5 w-5 text-amber-600 transition-transform ${expanded ? "rotate-180" : ""}`} />
                </button>
                <div
                  className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                    expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="mt-3 text-gray-700">{it.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
