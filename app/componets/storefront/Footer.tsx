// app/components/storefront/Footer.tsx
import Link from "next/link";
import Image from "next/image";
import { Facebook, Twitter, Linkedin, Instagram, Mail, Phone, MapPin, ExternalLink } from "lucide-react";

export default function Footer({
  logoSrc = "/2a_l2.png",
  companyNo = "15102296",
}: {
  logoSrc?: string;
  companyNo?: string;
  vatNo?: string;
}) {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-slate-950 text-slate-400">
      {/* Main */}
      <div className="mx-auto max-w-7xl px-6 lg:px-10 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand (logo only, bigger) */}
          <div>
            <Link href="/" className="inline-flex items-center" aria-label="Go to homepage">
              <Image
                src={logoSrc}
                alt="2A Construction logo"
                width={160}
                height={160}
                className="h-16 w-auto object-contain"
                priority
              />
            </Link>

            <p className="mt-4 text-sm leading-relaxed text-slate-300">
              Quality construction across London: extensions, loft conversions, roofing, and full refurbishments.
            </p>

            <ul className="mt-5 space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Mail size={16} aria-hidden />
                <a href="mailto:2a.construction.uk@gmail.com" className="hover:text-slate-200 transition">
                  2a.construction.uk@gmail.com
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={16} aria-hidden />
                <a href="tel:+447903095967" className="hover:text-slate-200 transition">
                  +44 790 3095 967
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MapPin size={16} aria-hidden />
                London, UK
              </li>
            </ul>

            {/* Socials */}
            <div className="mt-6 flex gap-4">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="hover:text-slate-200 transition">
                <Facebook size={18} />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter / X" className="hover:text-slate-200 transition">
                <Twitter size={18} />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="hover:text-slate-200 transition">
                <Linkedin size={18} />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hover:text-slate-200 transition">
                <Instagram size={18} />
              </a>
            </div>
          </div>

          {/* Company */}
          <nav aria-label="Company">
            <h3 className="text-slate-100 font-medium">Company</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/about" className="hover:text-slate-200 transition">About Us</Link></li>
              <li><Link href="/portfolio/all" className="hover:text-slate-200 transition">Projects</Link></li>
              <li><Link href="/contact" className="hover:text-slate-200 transition">Get a Quote</Link></li>
              <li><Link href="/policies/health-and-safety" className="hover:text-slate-200 transition">Health &amp; Safety</Link></li>
            </ul>
          </nav>

          {/* Services */}
          <nav aria-label="Services">
            <h3 className="text-slate-100 font-medium">Services</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/portfolio/extensions" className="hover:text-slate-200 transition">Extensions</Link></li>
              <li><Link href="/portfolio/loft" className="hover:text-slate-200 transition">Loft Conversions</Link></li>
              <li><Link href="/portfolio/roof" className="hover:text-slate-200 transition">Roofing</Link></li>
              <li><Link href="/portfolio/refurbishment" className="hover:text-slate-200 transition">Refurbishments</Link></li>
            </ul>
          </nav>

          {/* Certifications & Qualifications */}
          <nav aria-label="Certifications and Qualifications">
            <h3 className="text-slate-100 font-medium">Certifications &amp; Qualifications</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/certifications" className="hover:text-slate-200 transition">
                  Overview
                </Link>
              </li>
              <li className="flex items-center justify-between group">
                <a
                  href="https://www.safecontractor.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-slate-200 transition inline-flex items-center gap-2"
                >
                  SafeContractor (SSIP)
                  <ExternalLink size={14} className="opacity-60 group-hover:opacity-100" />
                </a>
              </li>
              <li className="flex items-center justify-between group">
                <a
                  href="https://www.chas.co.uk/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-slate-200 transition inline-flex items-center gap-2"
                >
                  CHAS (SSIP)
                  <ExternalLink size={14} className="opacity-60 group-hover:opacity-100" />
                </a>
              </li>
              <li className="flex items-center justify-between group">
                <a
                  href="https://www.constructionline.co.uk/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-slate-200 transition inline-flex items-center gap-2"
                >
                  Constructionline
                  <ExternalLink size={14} className="opacity-60 group-hover:opacity-100" />
                </a>
              </li>
              <li className="flex items-center justify-between group">
                <Link href="/certifications/iso-9001-14001-45001" className="hover:text-slate-200 transition inline-flex items-center gap-2">
                  ISO 9001, 14001 &amp; 45001
                </Link>
              </li>
              <li className="flex items-center justify-between group">
                <Link href="/certifications/ssip" className="hover:text-slate-200 transition inline-flex items-center gap-2">
                  SSIP Scheme Membership
                </Link>
              </li>
              <li className="flex items-center justify-between group">
                <Link href="/certifications/cscs-training" className="hover:text-slate-200 transition inline-flex items-center gap-2">
                  CSCS &amp; H&amp;S Training
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-slate-800" />

      {/* Legal bar */}
      <div className="mx-auto max-w-7xl px-6 lg:px-10 py-5 text-xs text-slate-500 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <p>© {year} 2A Construction. All rights reserved.</p>
        <p className="leading-relaxed">
          Registered in England &amp; Wales • Company No: {companyNo} 
        </p>
      </div>
    </footer>
  );
}
