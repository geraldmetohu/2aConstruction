
"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

const blackButton =
  "group relative inline-flex items-center gap-4 overflow-hidden rounded-none border border-black/90 bg-transparent px-5 py-2.5 text-sm font-medium tracking-wide text-black transition-all duration-300 hover:text-white";

const yellowButton =
  "group relative inline-flex items-center gap-4 overflow-hidden rounded-none border border-[#f5b400] bg-[#f5b400] px-5 py-2.5 text-sm font-medium tracking-wide text-black transition-all duration-300 hover:text-white";

export function TrustSection() {
  return (
    <section className="relative overflow-hidden bg-white pt-20 pb-10 md:pt-24 md:pb-12">
      {/* =========================================================
          CURVED TOP
      ========================================================== */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-32 w-[125%] -translate-x-1/2 -translate-y-[72%] rounded-[50%] bg-neutral-100 md:h-40"
      />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        {/* =========================================================
            TWO TRUST COLUMNS
        ========================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* =======================================================
              FMB
          ======================================================== */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.55 }}
            className="relative flex min-h-[310px] flex-col items-center justify-center px-6 py-8 text-center md:border-r md:border-neutral-200 md:px-10 lg:px-16"
          >
            {/* Small brand accent */}
            <div className="absolute left-1/2 top-0 h-1 w-12 -translate-x-1/2 bg-[#bd0738]" />

            <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#bd0738]">
              Professional Membership
            </span>

            <div className="relative mt-4 h-24 w-40 sm:h-28 sm:w-44">
              <Image
                src="/images/fmb-logo.png"
                alt="Federation of Master Builders"
                fill
                className="object-contain"
                sizes="176px"
              />
            </div>

            <p className="mt-4 max-w-xs text-sm leading-6 text-neutral-600">
              Trusted membership supporting quality construction standards.
            </p>

            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link
                href="/certifications#fmb-membership"
                className={blackButton}
              >
                <span className="relative z-10 flex items-center gap-4">
                  <span>View Membership</span>

                  <span className="text-lg leading-none transition-transform duration-300 group-hover:translate-x-1">
                    →
                  </span>
                </span>

                <span className="absolute inset-y-0 left-0 z-0 w-full origin-left scale-x-0 bg-black transition-transform duration-500 ease-out group-hover:scale-x-100" />
              </Link>

              <Link
                href="/certifications"
                className={yellowButton}
              >
                <span className="relative z-10 flex items-center gap-4">
                  <span>Certifications</span>

                  <span className="text-lg leading-none transition-transform duration-300 group-hover:translate-x-1">
                    →
                  </span>
                </span>

                <span className="absolute inset-y-0 left-0 z-0 w-full origin-left scale-x-0 bg-black transition-transform duration-500 ease-out group-hover:scale-x-100" />
              </Link>
            </div>
          </motion.div>

          {/* =======================================================
              SAFECONTRACTOR
          ======================================================== */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.55, delay: 0.08 }}
            className="relative flex min-h-[310px] flex-col items-center justify-center px-6 py-8 text-center md:px-10 lg:px-16"
          >
            {/* Small brand accent */}
            <div className="absolute left-1/2 top-0 h-1 w-12 -translate-x-1/2 bg-[#f5b400]" />

            <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-neutral-500">
              Accredited & Verified
            </span>

            <div className="mt-4 flex h-24 items-center justify-center sm:h-28">
              <Image
                src="/images/safe_contractor.png"
                alt="SafeContractor Approved"
                width={250}
                height={125}
                className="h-auto max-h-24 w-auto object-contain sm:max-h-28"
              />
            </div>

            <p className="mt-4 max-w-xs text-sm leading-6 text-neutral-600">
              Independently assessed for recognised safety standards.
            </p>

            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link
                href="/pdf/SCCertificate15122025.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className={blackButton}
              >
                <span className="relative z-10 flex items-center gap-4">
                  <span>View Certificate</span>

                  <span className="text-lg leading-none transition-transform duration-300 group-hover:translate-x-1">
                    →
                  </span>
                </span>

                <span className="absolute inset-y-0 left-0 z-0 w-full origin-left scale-x-0 bg-black transition-transform duration-500 ease-out group-hover:scale-x-100" />
              </Link>

              <Link
                href="https://www.ssipportal.org.uk/"
                target="_blank"
                rel="noopener noreferrer"
                className={yellowButton}
              >
                <span className="relative z-10 flex items-center gap-4">
                  <span>Verify</span>

                  <span className="text-lg leading-none transition-transform duration-300 group-hover:translate-x-1">
                    →
                  </span>
                </span>

                <span className="absolute inset-y-0 left-0 z-0 w-full origin-left scale-x-0 bg-black transition-transform duration-500 ease-out group-hover:scale-x-100" />
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* =========================================================
          BOTTOM HERO-STYLE LINE
      ========================================================== */}
      <div
        aria-hidden="true"
        className="mx-auto mt-7 h-px w-[calc(100%-3rem)] max-w-7xl bg-black/15 md:mt-9 lg:w-[calc(100%-4rem)]"
      />
    </section>
  );
}

