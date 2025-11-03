// app/contact/page.tsx
import { ContactForm } from "@/app/componets/storefront/ContactForm";
import Image from "next/image";
import Link from "next/link";
import { Mail, Phone, MapPin, ShieldCheck, Clock, CheckCircle2, MessageSquare } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="w-full">
      {/* HERO */}
      <section className="relative h-[42vh] md:h-[50vh] overflow-hidden text-white">
        <Image
          src="/roof.jpg"
          alt="Get a free quote"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/55 to-black/80" />
        <div className="relative z-10 h-full max-w-7xl mx-auto px-4 flex items-end pb-10">
          <div>
            <h1 className="text-3xl md:text-5xl font-extrabold leading-tight">Let’s plan your project</h1>
            <p className="mt-2 text-white/90">Free, no-obligation site visit and a clear, itemised quotation.</p>

            {/* Trust strip */}
            <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-white/85">
              <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-amber-400" /> Fully insured</span>
              <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-amber-400" /> 10-year structural guarantee</span>
              <span className="inline-flex items-center gap-2"><Clock className="h-4 w-4 text-amber-400" /> Quick turnaround</span>
            </div>
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 grid lg:grid-cols-5 gap-10">
          {/* Left: Contact options + Details */}
          <aside className="lg:col-span-2 space-y-6">
            {/* Quick contact cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ContactCard
                icon={<Phone className="h-5 w-5" />}
                title="Call us"
                subtitle="Mon–Fri 8am–6pm"
                href="tel:+447903095967"
                badge="Fastest"
              />
              <ContactCard
                icon={<Mail className="h-5 w-5" />}
                title="Email us"
                subtitle="Reply in 1–2 days"
                href="mailto:2a.construction.uk@gmail.com"
              />
              <ContactCard
                icon={<MessageSquare className="h-5 w-5" />}
                title="WhatsApp"
                subtitle="Share photos & plans"
                href="https://wa.me/447903095967"
                external
              />
              <ContactCard
                icon={<MapPin className="h-5 w-5" />}
                title="London, UK"
                subtitle="We cover Greater London"
                href="#map"
              />
            </div>

            {/* Contact details panel */}
            <div className="p-6 rounded-lg border border-amber-500/20">
              <h2 className="text-xl font-bold">Contact Details</h2>

              <ul className="mt-5 space-y-4 text-neutral-900">
                <li className="flex gap-3">
                  <Mail className="h-5 w-5 text-amber-500 shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-neutral-600">Email</div>
                    <Link href="mailto:2a.construction.uk@gmail.com" className="underline underline-offset-2">
                      2a.construction.uk@gmail.com
                    </Link>
                  </div>
                </li>

                <li className="flex gap-3">
                  <Phone className="h-5 w-5 text-amber-500 shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-neutral-600">Phone</div>
                    <Link href="tel:+447903095967" className="underline underline-offset-2">
                      +44 790 3095 967
                    </Link>
                  </div>
                </li>

                <li className="flex gap-3">
                  <MapPin className="h-5 w-5 text-amber-500 shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-neutral-600">Location</div>
                    <p>London, UK</p>
                  </div>
                </li>
              </ul>

              <div className="mt-6 text-sm text-neutral-700">
                <div className="font-medium mb-1">Opening hours</div>
                Mon–Fri: 8am–6pm • Sat: 9am–2pm • Sun: Closed
              </div>

              {/* Accreditations / KPIs */}
              <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                <KPI label="Projects" value="240+" />
                <KPI label="Avg. Rating" value="4.9/5" />
                <KPI label="Years" value="12" />
              </div>
            </div>

            {/* Map block */}
            <div id="map" className="rounded-lg border border-amber-500/20 overflow-hidden">
              <iframe
                title="Map - 2A Construction London"
                width="100%"
                height="100%"
                style={{ border: 0, display: "block", minHeight: 280 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d19815.02994456684!2d-0.127758!3d51.507351!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x48761b3330b2b7af%3A0x3fa0!2sLondon!5e0!3m2!1sen!2suk!4v1680000000000"
                allowFullScreen
              />
            </div>

            {/* Why choose us */}
            <div className="p-6 rounded-lg border border-amber-500/20">
              <h3 className="text-lg font-semibold">Why choose us?</h3>
              <ul className="mt-4 space-y-2 text-neutral-800">
                <li className="flex items-start gap-2"><CheckCircle2 className="h-5 w-5 text-amber-500 mt-0.5" /> Dedicated project manager from day one</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="h-5 w-5 text-amber-500 mt-0.5" /> Clear, itemised quotations</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="h-5 w-5 text-amber-500 mt-0.5" /> Accredited trades & tidy sites</li>
              </ul>
            </div>
          </aside>

          {/* Right: Form Card */}
          <div className="lg:col-span-3">
            <div className="p-6 rounded-lg border border-amber-500/20">
              <h2 className="text-xl font-bold">Request a Free Quote</h2>
              <p className="mt-2 text-neutral-600">Tell us a bit about your project. We’ll get back within 1–2 working days.</p>

              <div className="mt-6">
                <ContactForm />
              </div>

              {/* Reassurance */}
              <p className="mt-4 text-xs text-neutral-500">
                We respect your privacy. Your details are used only to respond to your enquiry.
              </p>

              {/* Mini FAQ under form */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                <FAQItem q="How soon can you visit?" a="Site visits are typically available within 3–7 days depending on location and scope." />
                <FAQItem q="Do you handle approvals?" a="Yes — drawings, structural calcs, planning and building control where required." />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA stripe */}
      <section className="py-10 bg-gradient-to-r from-amber-50 to-white border-t border-amber-500/20">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="text-lg font-semibold">Prefer to talk?</div>
            <div className="text-neutral-700">Call us now and we can book your site visit today.</div>
          </div>
          <div className="flex gap-3">
            <Link href="tel:+447903095967" className="px-5 py-3 bg-amber-500 text-black font-medium rounded-md hover:opacity-90">
              Call +44 790 3095 967
            </Link>
            <Link href="/portfolio/all" className="px-5 py-3 rounded-md border border-amber-500/50 font-medium hover:bg-amber-50 text-amber-700">
              View Projects
            </Link>
          </div>
        </div>
      </section>

      {/* ContactPoint JSON-LD (SEO) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "2A Construction",
            url: "https://your-domain.com",
            contactPoint: [
              {
                "@type": "ContactPoint",
                telephone: "+44 790 3095 967",
                contactType: "customer service",
                areaServed: "GB",
                availableLanguage: ["en"],
                hoursAvailable: [
                  { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday","Tuesday","Wednesday","Thursday","Friday"], opens: "08:00", closes: "18:00" },
                  { "@type": "OpeningHoursSpecification", dayOfWeek: "Saturday", opens: "09:00", closes: "14:00" }
                ]
              }
            ]
          })
        }}
      />
    </div>
  );
}

/* ----------------- Small components ----------------- */

function ContactCard({
  icon,
  title,
  subtitle,
  href,
  badge,
  external,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  href: string;
  badge?: string;
  external?: boolean;
}) {
  const C = external ? "a" : Link;
  return (
    <C
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="group p-4 rounded-lg border border-amber-500/20 bg-white hover:shadow-lg transition-shadow"
    >
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-2 text-neutral-900">
          <span className="text-amber-500">{icon}</span>
          <span className="font-semibold">{title}</span>
        </div>
        {badge && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500 text-black">{badge}</span>}
      </div>
      <div className="mt-1 text-sm text-neutral-600">{subtitle}</div>
    </C>
  );
}

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-md border border-amber-500/20 bg-white">
      <div className="text-lg font-extrabold text-amber-600">{value}</div>
      <div className="text-xs text-neutral-600">{label}</div>
    </div>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  return (
    <div className="p-4 rounded-lg border border-amber-500/20 bg-white">
      <div className="font-medium text-neutral-900">{q}</div>
      <p className="mt-1 text-sm text-neutral-600">{a}</p>
    </div>
  );
}
