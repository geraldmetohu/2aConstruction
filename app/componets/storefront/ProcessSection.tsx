"use client";

import Link from "next/link";
import { ChevronRight, Ruler, PenTool, Hammer, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

type Step = { n: string; t: string; d: string; href: string; icon?: React.ReactNode };

const STEPS: Step[] = [
  { n: "01", t: "Free Site Visit & Quote", d: "We visit, measure, and provide a clear, itemised quotation.", href: "/contact#quote", icon: <Ruler className="h-5 w-5" /> },
  { n: "02", t: "Design & Planning", d: "Architectural drawings and approvals if required.", href: "/services#design", icon: <PenTool className="h-5 w-5" /> },
  { n: "03", t: "Build & Manage", d: "Dedicated project manager, weekly updates, tidy site.", href: "/services#build", icon: <Hammer className="h-5 w-5" /> },
  { n: "04", t: "Handover & Guarantee", d: "Snag-free delivery and long-term structural guarantee.", href: "/about#guarantee", icon: <ShieldCheck className="h-5 w-5" /> },
];

export function ProcessSection({
  steps = STEPS,
  accent = "from-amber-500 to-orange-500", // gradient accent for numbers & underline
  card = "bg-white border border-gray-200",  // card surface
  text = "text-gray-900",
  subtext = "text-gray-600",
}: {
  steps?: Step[];
  accent?: string;
  card?: string;
  text?: string;
  subtext?: string;
}) {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4">
        <h2 className={`text-2xl font-extrabold tracking-tight ${text}`}>How We Work</h2>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, delay: i * 0.06, ease: "easeOut" }}
            >
              <Link
                href={s.href}
                className={`group relative block rounded-xl p-5 ${card} transition-shadow hover:shadow-lg`}
              >
                {/* Accent number pill */}
                <div className="flex items-center gap-2">
                  <div className={`inline-flex items-center justify-center rounded-md px-2 py-1 text-xs font-semibold text-white bg-gradient-to-r ${accent}`}>
                    {s.n}
                  </div>
                  {s.icon && <div className="text-gray-500 group-hover:text-gray-700 transition">{s.icon}</div>}
                </div>

                {/* Title */}
                <div className={`mt-3 font-semibold ${text}`}>{s.t}</div>

                {/* Description */}
                <div className={`mt-2 text-sm leading-relaxed ${subtext}`}>
                  {s.d}
                </div>

                {/* CTA row */}
                <div className="mt-4 inline-flex items-center gap-1 font-medium text-amber-600 group-hover:text-orange-600 transition">
                  Learn more
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </div>

                {/* Accent underline on hover */}
                <span
                  className={`pointer-events-none absolute inset-x-5 bottom-3 h-0.5 scale-x-0 origin-left bg-gradient-to-r ${accent} transition-transform duration-300 group-hover:scale-x-100`}
                />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
