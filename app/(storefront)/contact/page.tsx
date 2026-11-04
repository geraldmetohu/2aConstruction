import type { Metadata } from "next";
import Image from "next/image";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { Eyebrow, PageHero } from "@/app/componets/storefront/site/ui";
import { COMPANY } from "@/app/componets/storefront/site/brand";
import { EnquiryForm } from "./EnquiryForm";
import { STOCK } from "@/app/componets/storefront/site/stock-photos";

export const metadata: Metadata = {
  title: "Contact",
  description: "Book a free site visit with 2A Construction. Call, WhatsApp or send us the details of your extension, loft, refurbishment or roofing project.",
  alternates: { canonical: "/contact" },
};

const SERVICE_LABEL: Record<string, string> = {
  extention: "House extension", loft: "Loft conversion", refurbishment: "Refurbishment", roof: "Roofing", general: "General building",
  painting: "Painting & decorating", flooring: "Flooring", plumbing: "Plumbing & heating", electrical: "Electrical",
};

const NEXT = [
  { t: "We call you back", d: "Usually within one working day, to understand the project and book a time." },
  { t: "Free site visit", d: "We measure up, look at access and structure, and talk through options and budget." },
  { t: "Itemised quotation", d: "A full written quotation with programme, payment stages and what you'd supply." },
];

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ service?: string; project?: string }> }) {
  const sp = await searchParams;
  const service = SERVICE_LABEL[sp.service ?? ""] ?? "";
  const reference = (sp.project ?? "").slice(0, 200);

  return (
    <>
      <PageHero
        image={STOCK.contactHero}
        imageAlt="Builder reviewing drawings on site"
        size="sm"
        eyebrow="Contact"
        title="Let's talk about"
        accent="your project."
        lead="Tell us what you have in mind. We'll arrange a free site visit and follow it with a clear, itemised quotation."
        crumbs={[{ label: "Home", href: "/" }, { label: "Contact" }]}
      />

      <section className="mx-auto grid max-w-7xl gap-16 px-5 py-16 sm:px-8 md:py-24 lg:grid-cols-12 lg:px-10">
        {/* Direct contact */}
        <aside className="lg:col-span-4">
          <Eyebrow>Speak to us</Eyebrow>
          <ul className="mt-8 divide-y divide-[#071a33]/10 border-y border-[#071a33]/10">
            <ContactRow href={COMPANY.phoneHref} icon={<Phone className="h-5 w-5" />} label="Call" value={COMPANY.phone} note="Quickest way to reach us" />
            <ContactRow href={COMPANY.whatsapp} external icon={<MessageCircle className="h-5 w-5" />} label="WhatsApp" value="Message us" note="Send photos or drawings" />
            <ContactRow href={COMPANY.emailHref} icon={<Mail className="h-5 w-5" />} label="Email" value={COMPANY.email} note="We reply within one working day" />
          </ul>

          <div className="mt-12">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500">Office hours</p>
            <dl className="mt-4 space-y-2 text-sm">
              {COMPANY.hours.map(h => (
                <div key={h.days} className="flex justify-between gap-6 border-b border-dashed border-[#071a33]/10 pb-2"><dt className="text-neutral-600">{h.days}</dt><dd className="font-medium text-[#071a33]">{h.time}</dd></div>
              ))}
            </dl>
          </div>

          <div className="mt-12">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500">Areas we cover</p>
            <p className="mt-4 text-sm leading-relaxed text-neutral-700">{COMPANY.areas.join(" · ")}, and the rest of Greater London.</p>
          </div>

          <div className="relative mt-12 hidden aspect-[4/3] overflow-hidden bg-neutral-200 lg:block">
            <Image src={STOCK.contactSide} alt="Tiler cutting a tile on site" fill sizes="30vw" className="object-cover" />
            <div aria-hidden className="absolute inset-x-0 bottom-0 h-1 bg-[#f5b400]" />
          </div>
        </aside>

        {/* Form */}
        <div id="enquiry" className="scroll-mt-28 lg:col-span-7 lg:col-start-6">
          <div id="quote" className="scroll-mt-28 border-t-4 border-[#f5b400] bg-white p-6 shadow-[0_30px_80px_-40px_rgba(7,26,51,0.35)] ring-1 ring-[#071a33]/10 sm:p-10">
            <h2 className="text-3xl font-semibold tracking-[-0.025em] text-[#071a33] md:text-4xl">Request a site visit</h2>
            <p className="mt-3 text-neutral-600">A few details help us come prepared. Only the starred fields are required.</p>
            <div className="mt-10"><EnquiryForm service={service} reference={reference} /></div>
          </div>
        </div>
      </section>

      {/* What happens next */}
      <section className="bg-[#071a33] text-white">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 md:py-20 lg:px-10">
          <Eyebrow tone="light">What happens next</Eyebrow>
          <ol className="mt-10 grid gap-10 md:grid-cols-3">
            {NEXT.map((s, i) => (
              <li key={s.t} className="group">
                <div className="relative mb-6 aspect-[16/10] overflow-hidden bg-white/5">
                  <Image src={STOCK.contactSteps[i]} alt="" fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover opacity-90 transition-all duration-[1.2s] ease-out group-hover:scale-105 group-hover:opacity-100" />
                </div>
                <div className="border-t border-white/15 pt-6">
                <span className="font-mono text-xs text-[#f5b400]">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-4 text-xl font-semibold">{s.t}</h3>
                <p className="mt-2 leading-relaxed text-white/70">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}

function ContactRow({ href, icon, label, value, note, external }: { href: string; icon: React.ReactNode; label: string; value: string; note: string; external?: boolean }) {
  return (
    <li>
      <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="group flex items-center gap-5 py-5">
        <span className="grid h-12 w-12 shrink-0 place-items-center bg-[#071a33] text-[#f5b400] transition-colors group-hover:bg-[#f5b400] group-hover:text-[#071a33]">{icon}</span>
        <span className="min-w-0">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500">{label}</span>
          <span className="block truncate text-lg font-semibold text-[#071a33]">{value}</span>
          <span className="block text-xs text-neutral-500">{note}</span>
        </span>
      </a>
    </li>
  );
}
