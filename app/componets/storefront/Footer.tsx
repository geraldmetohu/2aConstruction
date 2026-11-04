// app/componets/storefront/Footer.tsx
import Link from "next/link";
import Image from "next/image";
import { Facebook, Instagram, Linkedin, Mail, MessageCircle, Phone } from "lucide-react";
import { COMPANY } from "./site/brand";
import { CookieSettingsLink } from "./site/CookieNotice";

const SERVICES = [
  { href: "/portfolio/extention", label: "House extensions" },
  { href: "/portfolio/loft", label: "Loft conversions" },
  { href: "/portfolio/refurbishment", label: "Refurbishments" },
  { href: "/portfolio/roof", label: "Roofing" },
  { href: "/portfolio/general", label: "General building" },
  { href: "/services#painting", label: "Decorating, flooring & trades" },
];
const COMPANY_LINKS = [
  { href: "/about", label: "About us" },
  { href: "/portfolio/all", label: "Our work" },
  { href: "/services", label: "Services" },
  { href: "/estimator", label: "Estimator" },
  { href: "/areas", label: "Areas we cover" },
  { href: "/my-quotes", label: "Client portal" },
  { href: "/contact", label: "Contact" },
];
const POLICIES = [
  { href: "/certifications#fmb-membership", label: "FMB membership" },
  { href: "/certifications#safecontractor", label: "SafeContractor" },
  { href: "/certifications#health-safety", label: "Health & safety" },
  { href: "/certifications#environmental-policy", label: "Environmental" },
  { href: "/certifications#gdpr-policy", label: "Data protection" },
  { href: "/certifications#certifications", label: "All policies" },
];

export default function Footer({ logoSrc = "/2a_l2.png", companyNo = COMPANY.companyNo }: { logoSrc?: string; companyNo?: string }) {
  const year = new Date().getFullYear();
  return (
    <footer className="relative overflow-hidden bg-[#071a33] text-white/75">
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "repeating-linear-gradient(135deg, transparent 0, transparent 59px, #fff 60px, transparent 61px)" }} />

      {/* Call to action strip */}
      <div className="relative border-b border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-14 sm:px-8 md:flex-row md:items-end md:justify-between lg:px-10">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f5b400]">Have a project in mind?</p>
            <a href={COMPANY.phoneHref} className="mt-4 block text-3xl font-semibold tracking-[-0.03em] text-white transition-colors hover:text-[#f5b400] sm:text-5xl">{COMPANY.phone}</a>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href={COMPANY.emailHref} className="inline-flex items-center gap-3 border border-white/40 px-6 py-3.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:border-white hover:bg-white hover:text-[#071a33]"><Mail className="h-4 w-4" />Email</a>
            <a href={COMPANY.whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 border border-white/40 px-6 py-3.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:border-white hover:bg-white hover:text-[#071a33]"><MessageCircle className="h-4 w-4" />WhatsApp</a>
          </div>
        </div>
      </div>

      {/* Columns */}
      <div className="relative mx-auto grid max-w-7xl grid-cols-2 gap-x-8 gap-y-12 px-5 py-14 sm:px-8 md:grid-cols-12 lg:px-10">
        <div className="col-span-2 md:col-span-4">
          <Link href="/" aria-label="2A Construction homepage" className="inline-block">
            <Image src={logoSrc} alt="2A Construction" width={170} height={170} className="h-16 w-auto object-contain" />
          </Link>
          <p className="mt-6 max-w-sm text-sm leading-relaxed">Extensions, loft conversions, refurbishments and roofing across London, North London and the South East, planned properly and built to last.</p>
          <ul className="mt-6 space-y-2 text-sm">
            <li><a href={COMPANY.emailHref} className="inline-flex items-center gap-2 hover:text-[#f5b400]"><Mail className="h-4 w-4" />{COMPANY.email}</a></li>
            <li><a href={COMPANY.phoneHref} className="inline-flex items-center gap-2 hover:text-[#f5b400]"><Phone className="h-4 w-4" />{COMPANY.phone}</a></li>
          </ul>
          <div className="mt-6 flex gap-2">
            {[{ href: "https://www.facebook.com/2A.Construction.WA/", icon: Facebook, label: "Facebook" }, { href: COMPANY.social.instagram, icon: Instagram, label: "Instagram" }, { href: COMPANY.social.linkedin, icon: Linkedin, label: "LinkedIn" }].map(s => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} className="grid h-10 w-10 place-items-center border border-white/15 transition-colors hover:border-[#f5b400] hover:bg-[#f5b400] hover:text-[#071a33]"><s.icon className="h-4 w-4" /></a>
            ))}
          </div>
        </div>
        <FooterCol title="Services" links={SERVICES} className="md:col-span-3 md:col-start-6" />
        <FooterCol title="Company" links={COMPANY_LINKS} className="md:col-span-2" />
        <FooterCol title="Compliance" links={POLICIES} className="md:col-span-2" />
      </div>

      {/* Accreditation + legal */}
      <div className="relative border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-8 text-xs text-white/50 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-10">
          <div className="flex items-center gap-4">
            <span className="grid h-10 w-20 place-items-center bg-white px-2"><Image src="/images/fmb-logo.png" alt="FMB member" width={70} height={32} className="h-7 w-auto object-contain" /></span>
            <span className="grid h-10 w-20 place-items-center bg-white px-2"><Image src="/images/safe_contractor.png" alt="SafeContractor approved" width={70} height={32} className="h-7 w-auto object-contain" /></span>
          </div>
          <div className="space-y-1 md:text-right">
            <p>© {year} {COMPANY.legalName}. All rights reserved.</p>
            <p>Registered in England &amp; Wales · Company No. {companyNo}</p>
            <p className="flex flex-wrap gap-x-4 gap-y-1 md:justify-end">
              <Link href="/privacy" className="hover:text-white">Privacy</Link>
              <Link href="/terms" className="hover:text-white">Terms &amp; conditions</Link>
              <Link href="/cookies" className="hover:text-white">Cookies</Link>
              <CookieSettingsLink className="hover:text-white" />
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links, className = "" }: { title: string; links: { href: string; label: string }[]; className?: string }) {
  return (
    <nav aria-label={title} className={className}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white">{title}</p>
      <ul className="mt-5 space-y-2.5 text-sm">
        {links.map(l => <li key={l.href}><Link href={l.href} className="transition-colors hover:text-[#f5b400]">{l.label}</Link></li>)}
      </ul>
    </nav>
  );
}
