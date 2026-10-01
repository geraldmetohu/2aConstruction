"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { useRef } from "react";

export function CTAQuote({
title = "Let's build something worth coming home to.",
blurb = "Extensions, lofts, refurbishments and roofing — carefully planned, professionally delivered.",
ctaHref = "/contact#quote",
ctaText = "Request a Free Quote",
secondaryHref = "/portfolio/all",
secondaryText = "View Our Projects",
imgSrc = "/roof.jpg",
imgAlt = "2A Construction project",
}: {
title?: string;
blurb?: string;
ctaHref?: string;
ctaText?: string;
secondaryHref?: string;
secondaryText?: string;
imgSrc?: string;
imgAlt?: string;
}) {
const sectionRef = useRef<HTMLElement | null>(null);

const { scrollYProgress } = useScroll({
target: sectionRef,
offset: ["start end", "end start"],
});

const imageY = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);

return ( <section
   ref={sectionRef}
   className="relative isolate min-h-[680px] overflow-hidden bg-[#25241f] sm:min-h-[720px]"
 >
{/* Full background image */}
<motion.div
style={{ y: imageY }}
className="absolute inset-[-8%] -z-20"
> <Image
       src={imgSrc}
       alt={imgAlt}
       fill
       sizes="100vw"
       className="object-cover"
       priority
     />
</motion.div>

```
  {/* Dark architectural overlay */}
  <div className="absolute inset-0 -z-10 bg-[#25241f]/80" />

  {/* Image gradient */}
  <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#25241f] via-[#25241f]/80 to-[#25241f]/30" />

  {/* Architectural yellow panel */}
  <div
    aria-hidden
    className="pointer-events-none absolute -right-24 top-[-15%] h-[130%] w-[38%] rotate-[12deg] bg-[#f5b400]/90 mix-blend-multiply"
  />

  {/* Fine diagonal lines */}
  <div
    aria-hidden
    className="pointer-events-none absolute inset-0 opacity-[0.12]"
    style={{
      backgroundImage:
        "repeating-linear-gradient(135deg, transparent 0, transparent 49px, #ffffff 50px, transparent 51px)",
    }}
  />

  <div className="relative mx-auto flex min-h-[680px] max-w-[1400px] items-center px-5 py-24 sm:min-h-[720px] sm:px-8 lg:px-12">
    <div className="max-w-4xl">
      {/* Label */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6 }}
        className="flex items-center gap-4"
      >
        <span className="h-px w-12 bg-[#f5b400]" />

        <span className="text-xs font-bold uppercase tracking-[0.3em] text-white/70">
          Start your project
        </span>
      </motion.div>

      {/* Heading */}
      <motion.h2
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.7, delay: 0.08 }}
        className="mt-8 max-w-4xl text-5xl font-extrabold leading-[0.95] tracking-[-0.05em] text-white sm:text-6xl md:text-7xl lg:text-[6.5rem]"
      >
        {title}
      </motion.h2>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6, delay: 0.16 }}
        className="mt-8 max-w-xl text-base leading-7 text-white/65 sm:text-lg"
      >
        {blurb}
      </motion.p>

      {/* Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6, delay: 0.24 }}
        className="mt-9 flex flex-wrap gap-3"
      >
        <Link
          href={ctaHref}
          className="group inline-flex items-center gap-3 bg-[#f5b400] px-6 py-4 text-sm font-bold text-[#25241f] transition-all duration-300 hover:bg-white"
        >
          {ctaText}

          <ArrowUpRight
            size={18}
            className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          />
        </Link>

        <Link
          href={secondaryHref}
          className="group inline-flex items-center gap-3 border border-white/30 bg-white/[0.04] px-6 py-4 text-sm font-bold text-white backdrop-blur-sm transition-all duration-300 hover:border-white hover:bg-white hover:text-[#25241f]"
        >
          {secondaryText}

          <ArrowUpRight
            size={18}
            className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          />
        </Link>
      </motion.div>

      {/* Trust details */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, delay: 0.35 }}
        className="mt-12 flex flex-wrap gap-x-7 gap-y-3 border-t border-white/15 pt-6"
      >
        <span className="flex items-center gap-2 text-xs font-medium text-white/60">
          <CheckCircle2 size={15} className="text-[#f5b400]" />
          Fully insured
        </span>

        <span className="flex items-center gap-2 text-xs font-medium text-white/60">
          <ShieldCheck size={15} className="text-[#f5b400]" />
          Professional team
        </span>

        <span className="flex items-center gap-2 text-xs font-medium text-white/60">
          <CheckCircle2 size={15} className="text-[#f5b400]" />
          Free consultation
        </span>
      </motion.div>
    </div>
  </div>

  {/* Bottom architectural marker */}
  <div className="absolute bottom-0 left-0 right-0 h-px bg-white/20" />

  <div
    aria-hidden
    className="absolute bottom-0 left-0 h-2 w-32 bg-[#f5b400]"
  />
</section>


);
}
