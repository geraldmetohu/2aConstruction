"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Hammer,
  Ruler,
  PenTool,
  Home,
  Layers,
  Wrench,
  ShieldCheck,
  ChevronRight,
  PaintRoller,
  Plug,
  DoorOpen,
  BrickWall,
  Waves,
} from "lucide-react";
import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  type Variants,
} from "framer-motion";

// Parent: staggers children
const containerStagger: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

// Child: slide up
const itemUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export default function ServicesPage() {
  const heroRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "12%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.9]);

  return (
    <div className="w-full bg-white">
      {/* HERO */}
      <section
        ref={heroRef}
        className="relative h-[38vh] md:h-[50vh] overflow-hidden text-white"
      >
        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="absolute inset-0">
          <Image
            src="/roof.jpg"
            alt="Construction services in London"
            fill
            className="object-cover"
            priority
          />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/65 to-black/80" />
        <div className="relative z-10 h-full max-w-7xl mx-auto px-4 flex items-end pb-10">
          <div>
            <h1 className="text-3xl md:text-5xl font-extrabold leading-tight">
              Full-service building, from family homes to HMOs.
            </h1>
            <p className="mt-2 text-white/90 max-w-xl">
              Extensions, lofts, full refurbishments, roofing, and compliant HMO & commercial
              conversions — delivered on time, on budget, and to regulation.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/contact#quote"
                className="px-5 py-3 bg-amber-500 text-black font-medium rounded-md hover:opacity-90"
              >
                Request a Free Quote
              </Link>
              <Link
                href="/portfolio/all"
                className="px-5 py-3 border border-white/80 text-white font-medium rounded-md hover:bg-white/10"
              >
                View Projects
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN SERVICES GRID */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight">
            What we do
          </h2>
          <p className="mt-2 text-neutral-700 max-w-2xl">
            2A Construction delivers complete building solutions – from structural extensions
            and loft conversions to full internal refurbishments and roofing.
          </p>

          <motion.div
            variants={containerStagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            <ServiceCard
              icon={<Home className="h-6 w-6" />}
              title="House Extensions"
              blurb="Single and double-storey extensions, open-plan living, and structural steel installation."
              href="/portfolio/extention"
              bullets={[
                "Planning & design collaboration",
                "RSJs, foundations and structural works",
                "Building Control inspections & sign-off",
              ]}
              imageSrc="/extention.jpeg"
            />
            <ServiceCard
              icon={<Layers className="h-6 w-6" />}
              title="Loft Conversions"
              blurb="Dormer, hip-to-gable, mansard, and Velux conversions to add bedrooms and value."
              href="/portfolio/loft"
              bullets={[
                "Staircase design & layout optimisation",
                "Insulation and fire regulation compliance",
                "En-suite bathrooms and roof lights",
              ]}
              imageSrc="/loft.jpg"
            />
            <ServiceCard
              icon={<Wrench className="h-6 w-6" />}
              title="Full Refurbishments"
              blurb="Complete strip-out and rebuild of houses and flats, including kitchens, bathrooms and reconfiguration."
              href="/portfolio/refurbishment"
              bullets={[
                "Internal reconfiguration & stud walls",
                "Plastering, tiling, flooring & finishes",
                "Electrical & plumbing upgrades",
              ]}
              imageSrc="/refurbishment.jpg"
            />
            <ServiceCard
              icon={<ShieldCheck className="h-6 w-6" />}
              title="Roofing & Envelope"
              blurb="New roofs, re-roofs and repairs in tile, slate, GRP, and EPDM flat roofing systems."
              href="/portfolio/roof"
              bullets={[
                "New pitched & flat roofs",
                "Leadwork, gutters & fascia",
                "Repairs after leaks or storm damage",
              ]}
              imageSrc="/roof.jpg"
            />
            <ServiceCard
              icon={<PaintRoller className="h-6 w-6" />}
              title="Painting & Decorating"
              blurb="Internal and external decorating with clean preparation and durable finishes."
              href="/services/painting"
              bullets={[
                "Full prep & repair of surfaces",
                "High-quality paints & finishes",
                "Feature walls & woodwork",
              ]}
              imageSrc="/painting.jpg"
            />
            <ServiceCard
              icon={<BrickWall className="h-6 w-6" />}
              title="Flooring & Tiling"
              blurb="Laminate, engineered wood, LVT, tiles and more – fitted to tight lines and levels."
              href="/services/flooring"
              bullets={[
                "Subfloor prep & levelling",
                "Ceramic, porcelain & stone tiling",
                "Skirtings & finishing trims",
              ]}
              imageSrc="/flooring.jpg"
            />
          </motion.div>
        </div>
      </section>

      {/* FEATURED GALLERY */}
      <FeaturedGallery
        items={[
          { src: "/extention.jpeg", alt: "Kitchen extension" },
          { src: "/loft.jpg", alt: "Loft conversion" },
          { src: "/refurbishment.jpg", alt: "Full refurbishment" },
          { src: "/roof.jpg", alt: "New roof" },
          { src: "/painting.jpg", alt: "Painting and decorating" },
          { src: "/flooring.jpg", alt: "Flooring and tiling" },
        ]}
      />
{/* ----------------------------------------------- */}
{/* DOMESTIC BUILDING SERVICES OVERVIEW - UPGRADED */}
{/* ----------------------------------------------- */}
<section className="py-20 bg-white">
  <div className="max-w-7xl mx-auto px-4">
    <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-neutral-900">
      Complete Domestic Building Services
    </h2>

    <p className="mt-4 max-w-3xl text-neutral-700 leading-relaxed text-lg">
      We cover every aspect of domestic construction — from structural works and first fix,
      to premium finishing and compliance. Our team delivers professional-grade workmanship,
      reliable scheduling, and clear communication throughout the entire build journey.
    </p>

    <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* CARD 1 */}
      <div className="p-6 bg-white border border-amber-500/30 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300">
        <div className="flex items-center gap-2 mb-3">
          <Hammer className="h-6 w-6 text-amber-500" />
          <h3 className="font-semibold text-lg text-neutral-900">
            Core Trades & Structure
          </h3>
        </div>
        <ul className="space-y-2 text-sm text-neutral-700 leading-relaxed">
          <li>• Demolition & strip-out</li>
          <li>• Blockwork, brickwork & foundations</li>
          <li>• Stud walls, partitions & reconfiguration</li>
          <li>• Insulation & soundproofing (Part E)</li>
          <li>• First-fix carpentry & joinery</li>
          <li>• Windows, doors, skylights & roof lights</li>
        </ul>
      </div>

      {/* CARD 2 */}
      <div className="p-6 bg-white border border-amber-500/30 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300">
        <div className="flex items-center gap-2 mb-3">
          <Plug className="h-6 w-6 text-amber-500" />
          <h3 className="font-semibold text-lg text-neutral-900">
            MEP & Compliance
          </h3>
        </div>
        <ul className="space-y-2 text-sm text-neutral-700 leading-relaxed">
          <li>• Electrical rewires & upgrades (Part P)</li>
          <li>• Consumer units & full certification</li>
          <li>• Plumbing & heating systems</li>
          <li>• Bathrooms, wet rooms & sanitaryware</li>
          <li>• Ventilation systems (Part F)</li>
          <li>• Fire & safety systems: smoke / heat / CO</li>
        </ul>
      </div>

      {/* CARD 3 */}
      <div className="p-6 bg-white border border-amber-500/30 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300">
        <div className="flex items-center gap-2 mb-3">
          <DoorOpen className="h-6 w-6 text-amber-500" />
          <h3 className="font-semibold text-lg text-neutral-900">
            Finishing & Lifestyle
          </h3>
        </div>
        <ul className="space-y-2 text-sm text-neutral-700 leading-relaxed">
          <li>• Kitchens supplied & fitted</li>
          <li>• Tiling for walls & floors</li>
          <li>• Flooring: LVT, laminate, engineered wood</li>
          <li>• Skirting, architraves & internal doors</li>
          <li>• Painting & decorating</li>
          <li>• Patios, paving, steps & outdoor works</li>
        </ul>
      </div>
    </div>
  </div>
</section>

{/* ---------------------------------------------- */}
{/* HMO DEVELOPMENT & COMPLIANCE - UPGRADED & RICH */}
{/* ---------------------------------------------- */}
<section className="py-24 bg-neutral-50" id="hmo-development">
  <div className="max-w-7xl mx-auto px-4">

    {/* TITLE */}
    <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-neutral-900">
      HMO Development & Compliance
    </h2>

    <p className="mt-4 max-w-4xl text-neutral-700 text-lg leading-relaxed">
      We specialise in complete HMO conversions, delivering properties that meet all legal,
      safety and licensing requirements. Our team manages the entire lifecycle — from design,
      planning and fire strategy, to construction and final certification. Every detail is handled
      with precision to ensure investment-grade, compliant results.
    </p>

    {/* GRID */}
    <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">

      {/* PACKAGE CARD */}
      <div className="p-7 bg-black text-white rounded-2xl shadow-xl border border-amber-500/40">
        <h3 className="font-bold text-xl mb-4 text-amber-400 tracking-wide">
          Full HMO Compliance Package
        </h3>
        <ul className="space-y-2.5 text-sm leading-relaxed text-neutral-200">
          <li>• Full HMO architectural design</li>
          <li>• Planning applications & LDC submissions</li>
          <li>• Fire door sets (FD30) & compartmentation</li>
          <li>• AOV systems, signage & escape strategy</li>
          <li>• Fire alarm systems (Grade A / LD2 / LD3)</li>
          <li>• Emergency lighting installation</li>
          <li>• Part B (fire), Part M (access), Part P (electrics)</li>
          <li>• Structural reconfiguration & load-bearing works</li>
          <li>• Kitchen, bathroom & full interior renovation</li>
          <li>• Soundproofing (Part E)</li>
          <li>• Full Building Control management</li>
          <li>• Final Fire Risk Assessment</li>
          <li>• HMO Licence application support</li>
        </ul>
      </div>

      {/* IMAGE BLOCK */}
      <div className="relative h-80 rounded-2xl overflow-hidden shadow-lg">
        <Image
          src="/hmo1.jpg"
          alt="Professional HMO conversion"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
      </div>

      {/* IDEAL FOR */}
      <div className="p-7 bg-white border border-neutral-300 rounded-2xl shadow-md">
        <h3 className="font-semibold text-xl mb-4 text-neutral-900">
          Ideal For
        </h3>

        <ul className="space-y-2 text-neutral-700 text-sm leading-relaxed">
          <li>• Landlords growing their portfolio</li>
          <li>• Property investors & sourcing agents</li>
          <li>• Estate & letting agents</li>
          <li>• Developers targeting multi-let markets</li>
          <li>• Conversions from family home → HMO</li>
          <li>• Investors following BRRR & high-yield models</li>
        </ul>

        <div className="mt-6 p-4 bg-amber-500/15 border border-amber-500/50 rounded-lg text-sm text-neutral-900">
          Considering an HMO conversion?  
          <br />We handle planning, fire design, construction and compliance under one contractor.
        </div>
      </div>
    </div>

    {/* CTA */}
    <div className="mt-14 p-8 bg-amber-500/20 border-l-4 border-amber-600 rounded-xl shadow-md">
      <h4 className="text-xl font-bold text-neutral-900">
        Thinking of converting your property into an HMO?
      </h4>
      <p className="mt-2 text-neutral-800 max-w-2xl">
        We provide full planning, design, compliance and construction management — ensuring your
        property is fully licensable, safe, and ready for high-yield tenancy.
      </p>

      <Link
        href="/contact#quote"
        className="inline-flex items-center gap-2 mt-5 px-8 py-3 bg-amber-500 text-black rounded-md font-semibold hover:bg-amber-600 transition"
      >
        Book a Free HMO Consultation
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  </div>
</section>
{/* ---------------------------------------------------- */}
{/* COMMERCIAL CHANGE OF USE — PREMIUM UPGRADED VERSION */}
{/* ---------------------------------------------------- */}
<section className="py-24 bg-neutral-50" id="commercial-change">
  <div className="max-w-7xl mx-auto px-4">

    <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-neutral-900">
      Commercial Change-of-Use
    </h2>

    <p className="mt-4 max-w-4xl text-neutral-700 text-lg leading-relaxed">
      Whether you’re converting a home into a clinic, turning retail into residential,
      or creating a mixed-use property, we handle the entire regulatory and construction
      pathway. Our team ensures your project meets planning requirements, Building
      Regulations, fire safety standards, access rules and commercial performance
      expectations — from early drawings to final sign-off.
    </p>

    <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">

      {/* WHAT WE MANAGE */}
      <div className="p-7 bg-white rounded-2xl shadow-lg border border-amber-500/30 hover:shadow-amber-500/20 transition-all duration-300">
        <h3 className="text-xl font-bold text-neutral-900 mb-4 flex items-center gap-2">
          <span className="text-amber-500">◆</span>
          What We Manage
        </h3>

        <ul className="space-y-2.5 text-sm text-neutral-700 leading-relaxed">
          <li>• Full planning permission for change-of-use (C3 → C1, C3 → Sui Generis, etc.)</li>
          <li>• All architectural, structural & compliance drawings</li>
          <li>• Traffic, noise & environmental assessments</li>
          <li>• Full fire strategy & compartmentation planning</li>
          <li>• Building Control management & submission</li>
          <li>• Complete commercial fit-out & refurbishment</li>
          <li>• Electrical, plumbing & MEP upgrades (certified)</li>
          <li>• Mechanical ventilation, HVAC & extraction systems</li>
          <li>• Accessibility compliance (DDA)</li>
        </ul>
      </div>

      {/* IMAGE BLOCK */}
      <div className="relative h-80 rounded-2xl shadow-xl overflow-hidden group">
        <Image
          src="/commercial1.jpg"
          alt="Commercial change-of-use"
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />
      </div>

      {/* EXAMPLES */}
      <div className="p-7 bg-black rounded-2xl shadow-xl border border-amber-500/40">
        <h3 className="text-xl font-bold mb-4 text-amber-400 tracking-wide">
          Examples of Change-of-Use Projects
        </h3>
        <ul className="space-y-2.5 text-sm text-neutral-200 leading-relaxed">
          <li>• House converted into office or medical clinic</li>
          <li>• Flat converted into a compliant commercial unit</li>
          <li>• Retail unit converted into residential flats</li>
          <li>• Family home → Licensed HMO (C3 → Sui Generis)</li>
          <li>• Loft converted into new rentable accommodation</li>
        </ul>
      </div>
    </div>
  </div>
</section>

{/* ------------------------------------------------------- */}
{/* WHY CHOOSE US — PREMIUM, TEXTURED, CONSISTENT DESIGN   */}
{/* ------------------------------------------------------- */}
<section className="py-24 bg-gradient-to-b from-white via-neutral-50 to-white">
  <div className="max-w-7xl mx-auto px-4">

    <h3 className="text-3xl md:text-4xl font-extrabold tracking-tight text-neutral-900">
      Why Choose 2A Construction
    </h3>

    <p className="mt-3 max-w-3xl text-neutral-700 leading-relaxed">
      Whether it’s a loft conversion, extension, renovation, HMO or commercial 
      change-of-use project — our process, compliance expertise and craftsmanship 
      ensure your project is delivered to the highest standard.
    </p>

    <motion.div
      variants={containerStagger}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.25 }}
      className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-8"
    >

      {/* PILLAR 1 ------------------------------------ */}
      <motion.div
        variants={itemUp}
        className="group relative p-8 bg-white rounded-2xl border border-neutral-200 shadow-sm hover:shadow-xl transition-all"
      >
        {/* Amber Glow Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500 rounded-t-xl opacity-70 group-hover:opacity-100 transition" />
        
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/20 rounded-xl text-amber-600 shadow-inner">
            <Ruler className="h-6 w-6" />
          </div>
          <h4 className="font-semibold text-lg text-neutral-900">Measured & organised</h4>
        </div>

        <p className="mt-4 text-neutral-700 leading-relaxed">
          Clear scope, detailed surveys, itemised quotations and structured project 
          management — so you always know the timeline, cost and next steps.
        </p>
      </motion.div>

      {/* PILLAR 2 ------------------------------------ */}
      <motion.div
        variants={itemUp}
        className="group relative p-8 bg-white rounded-2xl border border-neutral-200 shadow-sm hover:shadow-xl transition-all"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500 rounded-t-xl opacity-70 group-hover:opacity-100 transition" />

        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/20 rounded-xl text-amber-600 shadow-inner">
            <PenTool className="h-6 w-6" />
          </div>
          <h4 className="font-semibold text-lg text-neutral-900">Design to delivery</h4>
        </div>

        <p className="mt-4 text-neutral-700 leading-relaxed">
          We coordinate architects, engineers and Building Control — ensuring drawings, 
          compliance strategy and on-site work stay perfectly aligned.
        </p>
      </motion.div>

      {/* PILLAR 3 ------------------------------------ */}
      <motion.div
        variants={itemUp}
        className="group relative p-8 bg-white rounded-2xl border border-neutral-200 shadow-sm hover:shadow-xl transition-all"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500 rounded-t-xl opacity-70 group-hover:opacity-100 transition" />

        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/20 rounded-xl text-amber-600 shadow-inner">
            <Hammer className="h-6 w-6" />
          </div>
          <h4 className="font-semibold text-lg text-neutral-900">Craftsmanship & compliance</h4>
        </div>

        <p className="mt-4 text-neutral-700 leading-relaxed">
          Skilled trades, compliant installations and premium finishing — delivered to 
          meet lender, investor and local authority requirements every time.
        </p>
      </motion.div>

    </motion.div>
  </div>
</section>


{/* ------------------------------------------------------- */}
{/* PROCESS — PREMIUM, TEXTURED, GENERAL CONSTRUCTION       */}
{/* ------------------------------------------------------- */}
<section className="py-24 bg-gradient-to-b from-neutral-100 via-neutral-50 to-white">
  <div className="max-w-7xl mx-auto px-4">

    <h3 className="text-3xl md:text-4xl font-extrabold tracking-tight text-neutral-900">
      Our Construction Process
    </h3>

    <p className="mt-3 text-neutral-700 max-w-3xl leading-relaxed">
      Whether it’s an extension, loft, refurbishment, HMO, structural work or a commercial 
      change-of-use, our process ensures clarity, safety, compliance and premium workmanship 
      from day one to completion.
    </p>

    <motion.div
      variants={containerStagger}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.25 }}
      className="mt-14 grid grid-cols-1 lg:grid-cols-4 gap-7"
    >
      <motion.div variants={itemUp}>
        <Step
          num="01"
          title="Site Visit & Consultation"
          desc="We inspect your property, take measurements, assess structural and regulatory needs, and understand your design goals."
        />
      </motion.div>

      <motion.div variants={itemUp}>
        <Step
          num="02"
          title="Planning, Design & Approvals"
          desc="Architectural drawings, structural calculations, Building Control strategy and planning routes handled and coordinated for you."
        />
      </motion.div>

      <motion.div variants={itemUp}>
        <Step
          num="03"
          title="Construction & Project Management"
          desc="Skilled trades deliver the work with supervision, compliance checks, staged inspections and weekly project updates."
        />
      </motion.div>

      <motion.div variants={itemUp}>
        <Step
          num="04"
          title="Final Handover & Certification"
          desc="Snags completed, warranties issued and full compliance pack provided — ready for insurers, lenders or future valuations."
        />
      </motion.div>
    </motion.div>
  </div>
</section>


{/* ------------------------------------------------------- */}
{/* FAQ — MORE TEXTURE, MORE COLOR, PREMIUM FEEL           */}
{/* ------------------------------------------------------- */}
<section className="py-20 bg-neutral-100/60">
  <div className="max-w-7xl mx-auto px-4">

    <h3 className="text-3xl md:text-4xl font-extrabold tracking-tight text-neutral-900">
      Frequently Asked Questions
    </h3>

    <p className="mt-3 text-neutral-700 max-w-3xl">
      Here are the most common questions about our construction, renovation, extension and HMO/commercial services.
    </p>

    <motion.div
      variants={containerStagger}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.25 }}
      className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-7"
    >
      <motion.div variants={itemUp}>
        <FAQ
          q="How soon can you start?"
          a="Extensions, lofts and refurbishments usually begin within 2–6 weeks depending on scope. Compliance and drawings can start immediately."
        />
      </motion.div>

      <motion.div variants={itemUp}>
        <FAQ
          q="Do you handle planning and Building Control?"
          a="Yes. We manage architectural drawings, structural engineering, planning applications and Building Control submissions for all project types."
        />
      </motion.div>

      <motion.div variants={itemUp}>
        <FAQ
          q="Are you insured and compliant?"
          a="Yes. We carry Public Liability, Employers Liability and Professional Indemnity, and work with certified electricians, gas engineers and fire specialists."
        />
      </motion.div>

      <motion.div variants={itemUp}>
        <FAQ
          q="Can I see previous work?"
          a="Of course. Browse our portfolio or request case studies and references from similar projects."
          link={{ href: "/portfolio/all", label: "View portfolio" }}
        />
      </motion.div>
    </motion.div>
  </div>
</section>


{/* ------------------------------------------------------- */}
{/* CTA — CONSTRUCTION-FOCUSED, MORE COLOR + TEXTURE       */}
{/* ------------------------------------------------------- */}
<section className="relative isolate overflow-hidden py-20 bg-gradient-to-br from-amber-50 via-white to-neutral-100">
  <div className="absolute inset-0 pointer-events-none opacity-[0.12] bg-[url('/grid.svg')] bg-center" />

  <div className="max-w-7xl mx-auto px-4 grid lg:grid-cols-2 gap-12 items-center relative z-10">

    {/* Text */}
    <div>
      <h3 className="text-3xl md:text-4xl font-extrabold tracking-tight text-neutral-900">
        Planning a construction project?
      </h3>

      <p className="mt-4 text-neutral-700 max-w-xl leading-relaxed">
        Whether you're upgrading your home, converting your loft,
        extending your property, renovating internally, or delivering
        a full HMO/commercial conversion — we provide design, compliance 
        and construction services under one roof.
      </p>

      <div className="mt-7 flex flex-wrap gap-4">
        <Link
          href="/contact#quote"
          className="px-6 py-3 bg-amber-500 text-black font-semibold rounded-md hover:bg-amber-600 transition"
        >
          Contact Us for a Free Consultation
        </Link>

        <Link
          href="/about"
          className="px-6 py-3 border border-amber-500/60 rounded-md font-medium hover:bg-amber-50 text-amber-700 transition"
        >
          Learn More About Us
        </Link>
      </div>
    </div>

    {/* Image */}
    <div className="relative h-64 sm:h-80 lg:h-96 rounded-xl overflow-hidden shadow-2xl">
      <Image
        src="/refurbishment.jpg"
        alt="Construction project"
        fill
        className="object-cover scale-105 hover:scale-110 transition-transform duration-700"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
    </div>
  </div>
</section>
</div>
  );
}
/* ---------- reusable small components ---------- */

function ServiceCard({
  icon,
  title,
  blurb,
  href,
  bullets,
  imageSrc,
}: {
  icon: JSX.Element;
  title: string;
  blurb: string;
  href: string;
  bullets: string[];
  imageSrc: string;
}) {
  return (
    <motion.article
      variants={itemUp}
      className="group border border-amber-500/20 rounded-lg overflow-hidden bg-white hover:shadow-xl transition-shadow"
    >
      <div className="relative h-40 w-full overflow-hidden">
        <motion.div
          whileHover={{ scale: 1.05, y: -4 }}
          transition={{ type: "spring", stiffness: 180, damping: 18 }}
          className="h-full w-full"
        >
          <Image src={imageSrc} alt={title} fill className="object-cover" />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-70 group-hover:opacity-60 transition-opacity" />
      </div>

      <div className="p-5">
        <div className="flex items-center gap-2 text-neutral-900">
          <span className="text-amber-500">{icon}</span>
          <h4 className="font-semibold">{title}</h4>
        </div>
        <p className="mt-2 text-neutral-600">{blurb}</p>
        <ul className="mt-3 space-y-1 text-sm text-neutral-700">
          {bullets.map((b) => (
            <li key={b} className="flex gap-2">
              <span className="text-amber-500">•</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <Link
          href={href}
          className="mt-4 inline-flex items-center gap-1 text-amber-600 font-medium hover:text-amber-700"
        >
          See more <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </motion.article>
  );
}

function ServiceListCard({
  title,
  items,
  icon,
}: {
  title: string;
  items: string[];
  icon: JSX.Element;
}) {
  return (
    <div className="p-6 bg-white border border-amber-500/20 rounded-lg shadow-sm">
      <div className="flex items-center gap-2">
        {icon}
        <h4 className="font-semibold text-neutral-900">{title}</h4>
      </div>
      <ul className="mt-3 space-y-1 text-sm text-neutral-700">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="text-amber-500">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Pillar({
  icon,
  title,
  blurb,
}: {
  icon: JSX.Element;
  title: string;
  blurb: string;
}) {
  return (
    <motion.div
      variants={itemUp}
      className="group relative p-8 bg-white rounded-2xl border border-neutral-200 shadow-sm hover:shadow-xl transition-all"
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500 rounded-t-xl opacity-70 group-hover:opacity-100 transition" />

      <div className="flex items-center gap-3 text-neutral-900">
        <div className="p-3 bg-amber-500/20 rounded-xl text-amber-600 shadow-inner">
          {icon}
        </div>
        <h4 className="font-semibold text-lg">{title}</h4>
      </div>

      <p className="mt-4 text-neutral-700 leading-relaxed">{blurb}</p>
    </motion.div>
  );
}


function Step({ num, title, desc }: { num: string; title: string; desc: string }) {
  return (
    <div className="p-5 border border-amber-500/20 rounded-lg hover:shadow-lg transition-shadow bg-white">
      <div className="inline-flex items-center gap-2">
        <span className="px-2 py-1 text-xs font-semibold text-black bg-amber-500 rounded">
          {num}
        </span>
      </div>
      <div className="mt-2 font-semibold text-neutral-900">{title}</div>
      <div className="mt-1 text-sm text-neutral-600">{desc}</div>
    </div>
  );
}

function FAQ({
  q,
  a,
  link,
}: {
  q: string;
  a: string;
  link?: { href: string; label: string };
}) {
  return (
    <div className="p-5 bg-white border border-amber-500/20 rounded-lg">
      <div className="font-semibold text-neutral-900">{q}</div>
      <p className="mt-2 text-neutral-600">{a}</p>
      {link && (
        <Link
          href={link.href}
          className="mt-3 inline-flex items-center gap-1 text-amber-600 hover:text-amber-700"
        >
          {link.label} <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

function FeaturedGallery({
  items,
}: {
  items: { src: string; alt: string }[];
}) {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: rowRef,
    offset: ["start end", "end start"],
  });
  const translate = useTransform(scrollYProgress, [0, 1], ["-2%", "2%"]);

  return (
    <section className="py-12 bg-black text-white">
      <div className="max-w-7xl mx-auto px-4">
        <h3 className="text-xl md:text-2xl font-extrabold tracking-tight">
          Recent work snapshots
        </h3>
        <motion.div
          ref={rowRef}
          style={{ x: translate }}
          className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
        >
          {items.map((it, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45 }}
              className="relative h-28 sm:h-32 lg:h-36 rounded-md overflow-hidden"
            >
              <Image src={it.src} alt={it.alt} fill className="object-cover" />
              <div className="absolute inset-0 bg-black/10" />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
