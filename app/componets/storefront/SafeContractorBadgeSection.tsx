"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

export function SafeContractorBadgeSection() {
  return (
    <section className="py-20 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 text-white">
      <div className="max-w-7xl mx-auto px-6">

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center"
        >
          {/* LEFT – TEXT */}
          <div className="space-y-6">
            <span className="inline-block px-4 py-1 rounded-full bg-white/10 text-sm font-semibold tracking-wide">
              Accredited & Verified
            </span>

            <h2 className="text-3xl md:text-4xl font-extrabold leading-tight">
              SafeContractor Approved <br className="hidden sm:block" />
              Principal Contractor
            </h2>

            <p className="text-white/90 text-lg leading-relaxed max-w-xl">
              2A Construction Ltd is an approved SafeContractor, independently
              assessed against the SSIP Core Criteria. This confirms our full
              compliance with recognised UK health & safety standards across
              residential and commercial projects.
            </p>

            <ul className="space-y-2 text-sm text-white/90">
              <li>✔ Certificate No: <strong>KV8788</strong></li>
              <li>✔ Valid until: <strong>15 December 2026</strong></li>
              <li>✔ SSIP Core Criteria compliant</li>
            </ul>

            <div className="flex flex-wrap gap-4 pt-4">
              <Link
                href="/pdf/SCCertificate-15122025.pdf"
                target="_blank"
                className="px-6 py-3 rounded-lg bg-white text-blue-900 font-semibold hover:bg-blue-100 transition"
              >
                View Certificate (PDF)
              </Link>

              <Link
                href="https://www.ssipportal.org.uk/"
                target="_blank"
                className="px-6 py-3 rounded-lg border border-white font-semibold hover:bg-white hover:text-blue-900 transition"
              >
                Verify via SSIP Portal
              </Link>
            </div>
          </div>

          {/* RIGHT – LOGO */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex justify-center md:justify-end"
          >
            <div className="bg-white rounded-2xl p-10 shadow-2xl">
<img
  src="/images/safe_contractor.png"
  alt="SafeContractor Approved"
  className="h-[140px] w-auto object-contain"
/>


            </div>
          </motion.div>
        </motion.div>

      </div>
    </section>
  );
}
