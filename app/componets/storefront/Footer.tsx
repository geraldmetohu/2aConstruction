// app/components/storefront/Footer.tsx
import Link from "next/link";
import Image from "next/image";
import {
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
} from "lucide-react";

export default function Footer({
  logoSrc = "/2a_l2.png",
  companyNo = "15102296",
}: {
  logoSrc?: string;
  companyNo?: string;
}) {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-slate-950 text-slate-300 pt-16">
      {/* MAIN GRID */}
      <div className="max-w-7xl mx-auto px-6 lg:px-10 pb-14 grid grid-cols-1 md:grid-cols-4 gap-12">

        {/* --------------------------- */}
        {/* BRAND COLUMN                */}
        {/* --------------------------- */}
        <div>
          <Link href="/" aria-label="Homepage">
            <Image
              src={logoSrc}
              alt="2A Construction"
              width={170}
              height={170}
              className="h-20 w-auto object-contain"
              priority
            />
          </Link>

          <p className="mt-5 text-base leading-relaxed">
            Premium construction across London — extensions, loft conversions,
            roofing, HMO conversions & full domestic refurbishments.
          </p>

          <ul className="mt-5 space-y-2 text-base">
            <li className="flex items-center gap-2">
              <Mail size={16} />
              <a
                href="mailto:2a.construction.uk@gmail.com"
                className="hover:text-yellow-300 transition"
              >
                2a.construction.uk@gmail.com
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Phone size={16} />
              <a
                href="tel:+447903095967"
                className="hover:text-yellow-300 transition"
              >
                +44 790 3095 967
              </a>
            </li>
            <li className="flex items-center gap-2">
              <MapPin size={16} />
              London, UK
            </li>
          </ul>

          <div className="mt-6 flex gap-4">
            <a href="#" className="hover:text-yellow-300"><Facebook size={18} /></a>
            <a href="#" className="hover:text-yellow-300"><Twitter size={18} /></a>
            <a href="#" className="hover:text-yellow-300"><Linkedin size={18} /></a>
            <a href="#" className="hover:text-yellow-300"><Instagram size={18} /></a>
          </div>
        </div>

        {/* --------------------------- */}
        {/* COMPANY COLUMN              */}
        {/* --------------------------- */}
        <nav>
          <h3 className="text-orange-400 font-semibold text-lg">Company</h3>

          <ul className="mt-4 space-y-2 text-base">
            <li><Link href="/about" className="hover:text-yellow-300">About Us</Link></li>
            <li><Link href="/portfolio/all" className="hover:text-yellow-300">Projects</Link></li>
            <li><Link href="/contact" className="hover:text-yellow-300">Contact</Link></li>
            <li><Link href="/certifications" className="hover:text-yellow-300">Certifications</Link></li>
          </ul>
        </nav>

        {/* --------------------------- */}
        {/* SERVICES COLUMN             */}
        {/* --------------------------- */}
        <nav>
          <h3 className="text-orange-400 font-semibold text-lg">Services</h3>

          <ul className="mt-4 space-y-2 text-base">
            {/* MAIN SERVICES */}
            <li><Link href="/portfolio/extention" className="hover:text-yellow-300">Extensions</Link></li>
            <li><Link href="/portfolio/loft" className="hover:text-yellow-300">Loft Conversions</Link></li>
            <li><Link href="/portfolio/roof" className="hover:text-yellow-300">Roofing</Link></li>
            <li><Link href="/portfolio/refurbishment" className="hover:text-yellow-300">Refurbishments</Link></li>

            {/* NEW SERVICES ADDED */}
            <li><Link href="/portfolio/painting" className="hover:text-yellow-300">Painting & Decorating</Link></li>
            <li><Link href="/portfolio/flooring" className="hover:text-yellow-300">Flooring</Link></li>
            <li><Link href="/portfolio/plumbing" className="hover:text-yellow-300">Plumbing</Link></li>
            <li><Link href="/portfolio/electrical" className="hover:text-yellow-300">Electrical</Link></li>

            {/* SPECIALTY SECTIONS */}
            <li><Link href="/services#hmo-development" className="hover:text-yellow-300">HMO Conversions</Link></li>
            <li><Link href="/services#commercial-change" className="hover:text-yellow-300">Commercial Change-of-Use</Link></li>
          </ul>
        </nav>

        {/* --------------------------- */}
        {/* POLICIES COLUMN             */}
        {/* --------------------------- */}
        <nav>
          <h3 className="text-orange-400 font-semibold text-lg">Policies & Compliance</h3>

          <ul className="mt-4 space-y-2 text-base">
            <li>
              <Link href="/certifications#anti-bribery" className="hover:text-yellow-300">
                Anti-Bribery & Corruption Policy
              </Link>
            </li>
            <li>
              <Link href="/certifications#health-safety" className="hover:text-yellow-300">
                Health & Safety Policy
              </Link>
            </li>
            <li>
              <Link href="/certifications#environmental-policy" className="hover:text-yellow-300">
                Environmental Policy
              </Link>
            </li>
            <li>
              <Link href="/certifications#modern-slavery" className="hover:text-yellow-300">
                Modern Slavery Policy
              </Link>
            </li>
            <li>
              <Link href="/certifications#gdpr-policy" className="hover:text-yellow-300">
                GDPR / Data Protection Policy
              </Link>
            </li>
            <li>
              <Link href="/certifications#safeworkforce" className="hover:text-yellow-300">
                SafeWorkforce Policy
              </Link>
            </li>

            {/* Reserved for future policies */}
            <li className="opacity-30 mt-4">Privacy Policy (Coming Soon)</li>
            <li className="opacity-30">Terms & Conditions (Coming Soon)</li>
          </ul>
        </nav>

      </div>

      {/* DIVIDER */}
      <div className="border-t border-slate-800" />

      {/* BOTTOM BAR */}
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-5 text-xs text-slate-500 flex flex-col md:flex-row justify-between">
        <p>© {year} 2A Construction Ltd. All rights reserved.</p>
        <p>Registered in England & Wales • Company No: {companyNo}</p>
      </div>
    </footer>
  );
}
