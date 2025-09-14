"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

import roof from "@/public/roof.jpg";
import extention from "@/public/extention.jpeg";
import all from "@/public/general.jpg";
import general from "@/public/general.jpg";
import loft from "@/public/loft.jpg";
import refurbishment from "@/public/refurbishment.jpg";

const items = [
  { title: "All Projects", href: "/portfolio/all", img: all, span: "row-span-2" },
  { title: "General Projects", href: "/portfolio/general", img: general },
  { title: "Refurbishment", href: "/portfolio/refurbishment", img: refurbishment },
  { title: "Loft Conversions", href: "/portfolio/loft", img: loft },
  { title: "Extensions", href: "/portfolio/extention", img: extention },
  { title: "Roofing", href: "/portfolio/roof", img: roof },
];

export function AnimatedCategorySelection() {
  return (
    <section className="py-16">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-extrabold tracking-tight">Browse by Category</h2>
        <Link className="text-sm font-semibold text-primary hover:opacity-80" href="/portfolio/all">
          Browse all Projects →
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:grid-rows-2 lg:gap-6">
        {items.map((it, i) => (
          <motion.div
            key={it.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45, delay: i * 0.06, ease: "easeOut" }}
            className={`group relative overflow-hidden ${it.span ?? ""} h-64 sm:h-56 lg:h-72`}
          >
            <Image
              src={it.img}
              alt={`${it.title} Image`}
              fill
              className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority={i < 2}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/10 to-black/70" />
            <div className="absolute inset-0 p-6 flex items-end">
              <div>
                <h3 className="text-white text-lg font-semibold">{it.title}</h3>
                <Link
                  href={it.href}
                  className="inline-block mt-2 text-sm text-white/90 underline-offset-4 hover:underline"
                >
                  Explore
                </Link>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
