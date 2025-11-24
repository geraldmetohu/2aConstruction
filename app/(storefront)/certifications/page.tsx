"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function CertificationsPage() {
  const policies = [
    {
      id: "anti-bribery",
      title: "Anti-Bribery & Corruption Policy",
      file: "/pdf/Anti-Bribery_%26_Corruption%20Policy.pdf#zoom=65",
      desc: `This policy outlines 2A Construction’s strict zero-tolerance approach toward 
      bribery, unethical influence, or corruption in any form. It defines employee 
      responsibilities, reporting methods, and expected standards for suppliers and partners, 
      ensuring the highest level of transparency and professionalism in all operations.`,
    },
    {
      id: "health-safety",
      title: "Health & Safety Policy",
      file: "/pdf/CodeOfConduct_v1.0.pdf#zoom=65",
      desc: `Our Health & Safety Policy sets out the systems and procedures designed to 
      protect workers, clients, and visitors on all construction sites. It includes legal compliance, 
      risk assessments, emergency procedures, safe working practices, and continuous monitoring 
      to ensure all operations remain safe and controlled.`,
    },
    {
      id: "environmental-policy",
      title: "Environmental Policy",
      file: "/pdf/EnvironmentalPolicy_v1.0.pdf#zoom=65",
      desc: `This document outlines our commitment to reducing environmental impact through 
      responsible resource use, sustainable material selection, effective waste management, 
      and full compliance with UK environmental regulations. It highlights our long-term vision 
      for greener, more sustainable construction practices.`,
    },
    {
      id: "modern-slavery",
      title: "Modern Slavery Policy",
      file: "/pdf/ModernSlaveryPolicy_v1.0.pdf#zoom=65",
      desc: `Our Modern Slavery Policy ensures that exploitation, forced labour, or human 
      trafficking have no place within our business or supply chains. It defines preventative 
      measures, supplier expectations, awareness training, and reporting procedures to uphold 
      ethical standards throughout all operations.`,
    },
    {
      id: "gdpr-policy",
      title: "GDPR / Data Protection Policy",
      file: "/pdf/DataProtectionPolicy_v1.0.pdf#zoom=65",
      desc: `This policy explains how 2A Construction collects, processes, stores, and protects 
      personal data in compliance with UK GDPR. It covers data minimisation, retention rules, 
      breach reporting, rights of individuals, and secure handling practices across all departments.`,
    },
    {
      id: "safeworkforce",
      title: "SafeWorkforce Policy",
      file: "/pdf/SafeworkforcePolicy_v1.0.pdf#zoom=65",
      desc: `The SafeWorkforce Policy defines professional behaviour, communication rules, 
      site expectations, and standards of conduct required from every person representing 
      2A Construction. It ensures consistency, respect, and quality across all projects and teams.`,
    },
  ];

  return (
    <div className="min-h-screen bg-[#f7f7f7] py-20 relative">

      {/* Light geometric background */}
      <div className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(135deg,#00000015_0%,#00000005_100%)] pointer-events-none" />

      <div className="relative container space-y-24">

        {/* ---------------------- */}
        {/*  PAGE HEADER */}
        {/* ---------------------- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-5"
        >
          <h1 className="text-4xl font-extrabold text-black">Compliance & Policy Documentation</h1>

          <div className="w-24 h-1 bg-[#ffc92e] mx-auto rounded-full" />

          <p className="max-w-4xl mx-auto text-neutral-700 text-lg px-4 leading-relaxed">
            View all core policies that define 2A Construction’s commitment to safety, ethics, 
            transparency, and operational excellence. These documents outline the standards 
            governing how we work, how we protect people, and how we maintain full legal compliance.
          </p>
        </motion.div>

        {/* ---------------------- */}
        {/*  TOP NAVIGATION MENU */}
        {/* ---------------------- */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="
            sticky top-4 z-50
            w-full max-w-4xl mx-auto
            bg-white/80 backdrop-blur-xl
            shadow-lg rounded-xl border border-neutral-200
            px-6 py-4
            flex flex-wrap gap-4 justify-center
          "
        >
          {policies.map((p) => (
            <Link
              key={p.id}
              href={`#${p.id}`}
              className="
                text-sm font-semibold text-black hover:text-[#ffc92e]
                transition-colors duration-300
                border-b-2 border-transparent hover:border-[#ffc92e]
              "
            >
              {p.title}
            </Link>
          ))}

          {/* Placeholder link for certifications */}
          <Link
            href="#future-certifications"
            className="
              text-sm font-semibold text-black hover:text-[#ffc92e]
              transition-colors duration-300
              border-b-2 border-transparent hover:border-[#ffc92e]
            "
          >
            Future Certifications
          </Link>
        </motion.div>

        {/* ---------------------- */}
        {/*  FUTURE CERTIFICATION PLACEHOLDER */}
        {/* ---------------------- */}
        <section
          id="future-certifications"
          className=" hidden max-w-4xl mx-auto mt-10 mb-10 p-10 bg-white border border-neutral-300 rounded-2xl shadow-xl text-center"
        >
          <h2 className="text-3xl font-bold text-black mb-4">Accreditations Coming Soon</h2>
          <p className="text-neutral-700 leading-relaxed max-w-2xl mx-auto">
            This section will showcase verified certifications such as CHAS, SafeContractor, 
            Constructionline Gold, ISO 9001 / 14001 / 45001, and more. Once approved, 
            downloadable certificates and validation links will appear here.
          </p>
        </section>

        {/* ---------------------- */}
        {/*  POLICY SECTIONS */}
        {/* ---------------------- */}
        {policies.map((item, index) => (
          <motion.section
            key={item.id}
            id={item.id}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: index * 0.05 }}
            className="max-w-4xl mx-auto space-y-6"
          >
            {/* Title & Description */}
            <div className="space-y-3 px-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-10 bg-[#ffc92e] rounded-full shadow-md" />
                <h2 className="text-3xl font-bold text-black">{item.title}</h2>
              </div>

              <p className="text-neutral-700 text-lg leading-relaxed pl-5 border-l-2 border-neutral-300">
                {item.desc}
              </p>
            </div>

            {/* PDF Viewer */}
            <div className="bg-white p-6 shadow-2xl rounded-2xl border border-neutral-300">
              <div className="overflow-hidden rounded-xl border border-neutral-300 shadow-inner">
                <iframe
                  src={item.file}
                  className="w-full h-[500px] md:h-[650px] bg-white"
                />
              </div>
            </div>
          </motion.section>
        ))}

      </div>
    </div>
  );
}
