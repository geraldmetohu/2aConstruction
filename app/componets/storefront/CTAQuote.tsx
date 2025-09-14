"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";

export function CTAQuote({
  title = "Ready to build? Get a free, no-obligation quote.",
  blurb = "Extensions, lofts, refurbishments, roofing—delivered on time and within budget by a fully insured London team.",
  ctaHref = "/contact#quote",
  ctaText = "Request a Free Quote",
  secondaryHref = "/portfolio/all",
  secondaryText = "View Our Projects",
  imgSrc = "/roof.jpg", // put a 1600x1200-ish image in /public
  imgAlt = "Construction team on site",
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
  // subtle parallax when scrolling past section
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 400], [0, -16]);

  return (
    <section className="relative isolate overflow-hidden py-16">
      {/* soft background */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid gap-8 lg:grid-cols-2 items-center">
          {/* left: copy + ctas */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <h3 className="text-2xl font-extrabold tracking-tight">{title}</h3>
            <p className="mt-3 text-gray-600">{blurb}</p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={ctaHref}
                className="px-5 py-3 bg-primary text-white font-medium hover:opacity-90 transition"
              >
                {ctaText}
              </Link>
              <Link
                href={secondaryHref}
                className="px-5 py-3 border font-medium hover:bg-gray-50 transition"
              >
                {secondaryText}
              </Link>
            </div>

            {/* mini trust row */}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <span>✅ Fully insured</span>
              <span>🏆 CHAS / SafeContractor</span>
              <span>⭐ 4.9/5 reviews</span>
            </div>
          </motion.div>

          {/* right: image card */}
          <motion.div
            style={{ y }}
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative h-64 sm:h-80 lg:h-96 overflow-hidden"
          >
            <Image
              src={imgSrc}
              alt={imgAlt}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
              priority
            />
            {/* gradient for text legibility if you put text over image later */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
            {/* decorative accent */}
            <div className="pointer-events-none absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-primary/20 blur-2xl" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
