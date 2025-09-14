// app/componets/storefront/Footer.tsx
import Link from "next/link";
import Image from "next/image";
import { Facebook, Twitter, Linkedin, Instagram, Mail, Phone, MapPin } from "lucide-react";

export default function Footer({
  logoSrc,
  brandName = "2A Construction",
}: {
  logoSrc?: string;
  brandName?: string;
}) {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-slate-950 text-slate-400">
      {/* Main */}
      <div className="mx-auto max-w-7xl px-6 lg:px-10 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <Link href="/" className="inline-flex items-center gap-3">
              {logoSrc ? (
                <Image
                  src={logoSrc}
                  alt={`${brandName} logo`}
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-md object-contain"
                />
              ) : (
                <div className="h-10 w-10 rounded-md bg-slate-800 grid place-items-center text-slate-200 font-semibold">
                  {brandName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <span className="text-lg font-semibold text-slate-100">{brandName}</span>
            </Link>

            <p className="mt-4 text-sm leading-relaxed">
              Quality construction across London: extensions, loft conversions, roofing, and full refurbishments.
            </p>

            <ul className="mt-5 space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Mail size={16} />
                <a href="mailto:2aconstruction@gmail.com" className="hover:text-slate-200 transition">
                  2aconstruction@gmail.com
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={16} />
                <a href="tel:+447903095967" className="hover:text-slate-200 transition">
                  +44 790 3095 967
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MapPin size={16} />
                London, UK
              </li>
            </ul>
          </div>

          {/* Company */}
          <nav aria-label="Company">
            <h3 className="text-slate-100 font-medium">Company</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/about" className="hover:text-slate-200 transition">About Us</Link></li>
              <li><Link href="/portfolio/all" className="hover:text-slate-200 transition">Projects</Link></li>
              <li><Link href="/contact" className="hover:text-slate-200 transition">Get a Quote</Link></li>
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

          {/* Policies */}
          <nav aria-label="Policies">
            <h3 className="text-slate-100 font-medium">Policies</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/privacy" className="hover:text-slate-200 transition">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-slate-200 transition">Terms & Conditions</Link></li>
              <li><Link href="/policies/health-and-safety" className="hover:text-slate-200 transition">Health & Safety</Link></li>
              <li><Link href="/policies/environmental" className="hover:text-slate-200 transition">Environmental</Link></li>
            </ul>

            {/* Socials */}
            <div className="mt-5 flex gap-4">
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
          </nav>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-slate-800" />

      {/* Legal bar */}
      <div className="mx-auto max-w-7xl px-6 lg:px-10 py-5 text-xs text-slate-500 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <p>© {year} {brandName}. All rights reserved.</p>
        <p className="leading-relaxed">
          Registered in England &amp; Wales • Company No: 00000000 • VAT: GB000000000
        </p>
      </div>
    </footer>
  );
}
