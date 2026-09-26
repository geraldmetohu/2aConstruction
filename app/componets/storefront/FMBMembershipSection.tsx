"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

export function FMBMembershipSection() {
  return (
    <section className="relative overflow-hidden bg-white py-16 md:py-20">
      {/* Subtle background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-red-50 blur-3xl" />
        <div className="absolute -left-32 -bottom-32 h-96 w-96 rounded-full bg-amber-50 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="
            overflow-hidden
            rounded-3xl
            border border-neutral-200
            bg-white
            shadow-[0_20px_60px_rgba(0,0,0,0.08)]
          "
        >
          <div className="grid items-center md:grid-cols-[280px_1fr] lg:grid-cols-[330px_1fr]">
            
            {/* FMB Logo */}
            <div className="flex items-center justify-center bg-[#bd0738] p-10 md:min-h-[360px]">
              <div className="relative h-64 w-52 md:h-72 md:w-56">
                <Image
                  src="/images/fmb-logo.png"
                  alt="Federation of Master Builders"
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 208px, 224px"
                />
              </div>
            </div>

            {/* Content */}
            <div className="p-8 md:p-10 lg:p-12">
              <div className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-[#bd0738]">
                Professional Membership
              </div>

              <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-neutral-900 md:text-4xl">
                Federation of Master Builders
              </h2>

              <div className="mt-3 h-1 w-20 rounded-full bg-[#ffc92e]" />

              <p className="mt-6 max-w-3xl text-base leading-7 text-neutral-700 md:text-lg">
                2A Construction is a member of the Federation of Master Builders,
                demonstrating our commitment to professional standards,
                responsible construction practices and quality workmanship.
              </p>

              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-5">
                  <div className="text-sm font-bold text-neutral-900">
                    Professional Standards
                  </div>
                  <p className="mt-2 text-sm leading-6 text-neutral-600">
                    Our membership reflects our commitment to professional
                    standards within the construction industry.
                  </p>
                </div>

                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-5">
                  <div className="text-sm font-bold text-neutral-900">
                    Quality & Trust
                  </div>
                  <p className="mt-2 text-sm leading-6 text-neutral-600">
                    We aim to provide homeowners with dependable workmanship,
                    clear communication and professional project delivery.
                  </p>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/certifications#fmb-membership"
                  className="
                    inline-flex
                    items-center
                    justify-center
                    rounded-lg
                    bg-[#bd0738]
                    px-6
                    py-3
                    text-sm
                    font-semibold
                    text-white
                    shadow-sm
                    transition
                    hover:bg-[#a80531]
                  "
                >
                  View Membership Certificate
                </Link>

                <Link
                  href="/certifications"
                  className="
                    inline-flex
                    items-center
                    justify-center
                    rounded-lg
                    border
                    border-neutral-300
                    bg-white
                    px-6
                    py-3
                    text-sm
                    font-semibold
                    text-neutral-800
                    transition
                    hover:border-neutral-500
                    hover:bg-neutral-50
                  "
                >
                  View Certifications
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}