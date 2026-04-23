"use client";

import Image from "next/image";
import { FormEvent, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bath,
  BedDouble,
  Check,
  ClipboardList,
  Hammer,
  Home,
  ImagePlus,
  Ruler,
  Send,
  Sparkles,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ProjectType = "extension" | "loft" | "refurbishment" | "roof" | "foundations" | "garden";

const projectTypes: {
  id: ProjectType;
  title: string;
  summary: string;
  image: string;
}[] = [
  { id: "extension", title: "Extension", summary: "Rear, side return, wrap-around or double-storey additions.", image: "/images/ext.jpeg" },
  { id: "loft", title: "Loft conversion", summary: "Dormer, hip-to-gable, L-shape or Velux rooflight conversions.", image: "/images/loft.jpg" },
  { id: "refurbishment", title: "Refurbishment", summary: "Full home refresh, kitchens, bathrooms, layouts and finishes.", image: "/images/refurb.jpg" },
  { id: "roof", title: "Roof", summary: "Pitched, flat, repairs, replacements, gutters and fascias.", image: "/images/roof.jpg" },
  { id: "foundations", title: "Foundations", summary: "New structural bases, underpinning preparation and groundwork.", image: "/images/site_insp.jpg" },
  { id: "garden", title: "Garden / driveway", summary: "Paving, drainage, fencing, landscaping and parking surfaces.", image: "/images/general.jpg" },
];

const roofTiles = [
  { title: "Concrete interlocking", tone: "from-stone-500 to-stone-700", detail: "Durable and common across UK homes." },
  { title: "Clay plain tiles", tone: "from-orange-500 to-red-700", detail: "Traditional look with strong kerb appeal." },
  { title: "Slate tiles", tone: "from-slate-700 to-slate-950", detail: "Premium finish for period and modern roofs." },
  { title: "Pantiles", tone: "from-amber-600 to-orange-800", detail: "Curved profile, often used for character roofs." },
];

const loftTypes = [
  { title: "Dormer", image: "/images/loft.jpg", detail: "Adds headroom and floor space at the rear." },
  { title: "L-shape dormer", image: "/loft.jpg", detail: "Great for period properties with rear additions." },
  { title: "Hip-to-gable", image: "/images/roof.jpg", detail: "Extends the sloped side into a vertical wall." },
  { title: "Velux / rooflight", image: "/roof.jpg", detail: "Lower disruption where the roof volume already works." },
  { title: "Not sure yet", image: "/images/site_insp.jpg", detail: "We can advise after measurements and photos." },
];

const extensionStyles = [
  { title: "Rear extension", image: "/images/ext.jpeg", detail: "Most common for larger kitchen and dining spaces." },
  { title: "Side return", image: "/extention.jpeg", detail: "Uses side alley space to widen the ground floor." },
  { title: "Wrap-around", image: "/images/general.jpg", detail: "Combines rear and side return for a bigger layout." },
  { title: "Double storey", image: "/images/build.jpg", detail: "Adds upstairs space as well as ground floor space." },
  { title: "Not sure", image: "/images/site_insp.jpg", detail: "We can advise from plans, photos or a site visit." },
];

const dormerFinishes = [
  { title: "Tile hanging", image: "/roof.jpg", detail: "Classic UK dormer finish, often matched to roof tiles." },
  { title: "Rendering", image: "/images/refurb.jpg", detail: "Clean rendered finish, usually coloured or painted." },
  { title: "Cladding", image: "/images/general.jpg", detail: "Modern look with composite, timber-style or metal cladding." },
  { title: "Not sure", image: "/images/site_insp.jpg", detail: "Let us suggest the best finish for the property." },
];

const gardenFinishes = [
  { title: "Block paving", image: "/images/general.jpg", detail: "Flexible, repairable and common for driveways." },
  { title: "Porcelain tiles", image: "/images/refurb.jpg", detail: "Smart patio finish with a premium look." },
  { title: "Resin", image: "/images/site_insp.jpg", detail: "Smooth driveway finish when the base is suitable." },
  { title: "Tarmac", image: "/images/build.jpg", detail: "Practical surface for parking areas." },
  { title: "Turf / planting", image: "/general.jpg", detail: "Soft landscaping for gardens." },
  { title: "Not sure", image: "/images/site_insp.jpg", detail: "We can recommend after seeing levels and drainage." },
];

const finishDefaults = [
  "Electrical first fix",
  "Smoke alarms",
  "Fuse box",
  "Electrical certificate",
  "Plumbing first fix",
  "Radiators",
  "Boiler allowance",
  "Skirting and decorating prep",
  "Door hanging",
  "Architraves",
  "Door stops",
  "Door frames",
];

const steps = ["Project", "Measurements", "Details", "Logistics", "Budget", "Contact"];

export function EstimatorForm() {
  const [step, setStep] = useState(0);
  const [projectType, setProjectType] = useState<ProjectType>("loft");
  const [quality, setQuality] = useState(65);
  const [cheap, setCheap] = useState(45);
  const [fast, setFast] = useState(40);
  const [sent, setSent] = useState(false);

  const selectedProject = projectTypes.find((item) => item.id === projectType) ?? projectTypes[1];
  const tradeMood = useMemo(() => getTradeMood(quality, cheap, fast), [quality, cheap, fast]);

  function updateTradeSlider(name: "quality" | "cheap" | "fast", value: number) {
    if (name === "quality") {
      setQuality(value);
      setCheap(Math.max(10, 100 - value + 10));
      setFast(Math.max(10, Math.round(105 - value * 0.85)));
    }

    if (name === "cheap") {
      setCheap(value);
      setQuality(Math.max(10, 100 - value + 15));
      setFast(Math.max(10, Math.round(value * 0.75)));
    }

    if (name === "fast") {
      setFast(value);
      setCheap(Math.max(10, 100 - value + 5));
      setQuality(Math.min(100, Math.max(20, Math.round(45 + value * 0.45))));
    }
  }

  function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSent(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <section className="relative overflow-hidden bg-neutral-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.24),transparent_34rem),linear-gradient(135deg,rgba(255,255,255,0.08)_0_1px,transparent_1px_18px)]" />
      <div className="relative mx-auto max-w-7xl px-4 py-10 md:py-16">
        <div className="grid gap-8 lg:grid-cols-[0.86fr_1.14fr]">
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="overflow-hidden rounded-[2rem] border border-amber-400/25 bg-white/10 shadow-2xl backdrop-blur">
              <div className="relative h-64">
                <Image src={selectedProject.image} alt={selectedProject.title} fill className="object-cover" priority />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                <div className="absolute bottom-5 left-5 right-5">
                  <p className="text-xs font-bold uppercase tracking-[0.35em] text-amber-300">2A estimator</p>
                  <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">Build your brief.</h1>
                </div>
              </div>
              <div className="space-y-5 p-6">
                <p className="text-base leading-7 text-white/78">
                  Please enter your project details so we can estimate your cost and prepare a 3D rendering when you decide to book with us.
                </p>
                <div className="rounded-2xl border border-amber-300/25 bg-black/35 p-4">
                  <p className="text-sm font-semibold text-amber-200">Current project</p>
                  <p className="mt-1 text-2xl font-black">{selectedProject.title}</p>
                  <p className="mt-2 text-sm text-white/65">{selectedProject.summary}</p>
                </div>
                <div className="space-y-3">
                  {steps.map((item, index) => (
                    <div key={item} className="flex items-center gap-3">
                      <span className={cn("grid h-8 w-8 place-items-center rounded-full border text-xs font-black", index <= step ? "border-amber-300 bg-amber-400 text-black" : "border-white/20 text-white/50")}>
                        {index < step ? <Check className="h-4 w-4" /> : index + 1}
                      </span>
                      <span className={cn("text-sm font-semibold", index === step ? "text-white" : "text-white/50")}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          <form onSubmit={submitForm} className="rounded-[2rem] border border-white/10 bg-white p-4 text-neutral-950 shadow-2xl md:p-8">
            {sent ? (
              <SuccessState />
            ) : (
              <>
                <div className="mb-8">
                  <div className="mb-4 h-2 overflow-hidden rounded-full bg-neutral-200">
                    <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-cyan-400 transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
                  </div>
                  <p className="text-sm font-bold uppercase tracking-[0.25em] text-amber-700">Step {step + 1} of {steps.length}</p>
                </div>

                {step === 0 && <ProjectStep projectType={projectType} setProjectType={setProjectType} />}
                {step === 1 && <MeasurementStep />}
                {step === 2 && <ProjectDetailStep projectType={projectType} />}
                {step === 3 && <LogisticsStep />}
                {step === 4 && <BudgetStep quality={quality} cheap={cheap} fast={fast} tradeMood={tradeMood} updateTradeSlider={updateTradeSlider} />}
                {step === 5 && <ContactStep />}

                <div className="mt-10 flex flex-col gap-3 border-t border-neutral-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <Button type="button" variant="outline" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0} className="h-12 rounded-full border-neutral-300">
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                  {step < steps.length - 1 ? (
                    <Button type="button" onClick={() => setStep((current) => Math.min(steps.length - 1, current + 1))} className="h-12 rounded-full bg-neutral-950 px-7 text-white hover:bg-amber-500 hover:text-black">
                      Continue
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button type="submit" className="h-12 rounded-full bg-amber-500 px-7 text-black hover:bg-amber-400">
                      Send estimator request
                      <Send className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}

function ProjectStep({
  projectType,
  setProjectType,
}: {
  projectType: ProjectType;
  setProjectType: (value: ProjectType) => void;
}) {
  return (
    <StepShell
      eyebrow="Choose your work type"
      title="What are we estimating?"
      intro="Pick the closest option. If the scope changes later, that is fine. This just opens the right questions."
    >
      <div className="grid gap-4 md:grid-cols-2">
        {projectTypes.map((item) => (
          <button
            type="button"
            key={item.id}
            onClick={() => setProjectType(item.id)}
            className={cn(
              "group overflow-hidden rounded-3xl border text-left transition hover:-translate-y-1 hover:shadow-xl",
              projectType === item.id ? "border-amber-500 ring-4 ring-amber-200" : "border-neutral-200"
            )}
          >
            <div className="relative h-40">
              <Image src={item.image} alt={item.title} fill className="object-cover transition duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <span className="absolute bottom-4 left-4 rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-neutral-950">
                {item.title}
              </span>
            </div>
            <p className="p-4 text-sm leading-6 text-neutral-600">{item.summary}</p>
          </button>
        ))}
      </div>
    </StepShell>
  );
}

function MeasurementStep() {
  return (
    <StepShell
      eyebrow="Basic measurements"
      title="Tell us the rough size."
      intro="Approximate dimensions are enough. If you are not sure, use the not sure options and upload photos later."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Rough house width" placeholder="e.g. 6.2 metres or not sure" icon={<Ruler />} required />
        <Field label="Rough house length" placeholder="e.g. 9.5 metres or not sure" icon={<Ruler />} required />
        <Field label="Floor height" placeholder="e.g. 2.4 metres per floor" icon={<Home />} />
        <SelectLike label="Confidence" options={["Measured roughly", "Not sure", "Please advise from photos"]} required />
      </div>
      <TextareaBlock label="Anything unusual about access, structure or measurements?" placeholder="Tell us about narrow alleys, shared walls, sloped ground, previous works, etc." />
    </StepShell>
  );
}

function ProjectDetailStep({ projectType }: { projectType: ProjectType }) {
  if (projectType === "roof") return <RoofQuestions />;
  if (projectType === "loft") return <LoftQuestions />;
  if (projectType === "extension") return <ExtensionQuestions />;
  if (projectType === "garden") return <GardenQuestions />;
  if (projectType === "foundations") return <FoundationQuestions />;
  return <RefurbishmentQuestions />;
}

function RoofQuestions() {
  return (
    <StepShell eyebrow="Roof details" title="What does the roof need?" intro="Choose the roof type, finishes and the extra items you want included in the quote.">
      <ChoiceGrid title="Roof type" name="roofType" type="radio" required options={["Pitched roof", "Flat roof", "Roof repair only", "Not sure"]} />
      <div>
        <h3 className="mb-3 text-lg font-black">If pitched, choose tile style</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {roofTiles.map((tile) => (
            <label key={tile.title} className="flex cursor-pointer gap-3 rounded-2xl border border-neutral-200 p-3 transition hover:border-amber-400 has-[:checked]:border-amber-500 has-[:checked]:bg-amber-50 has-[:checked]:shadow-md">
              <input type="checkbox" name="roofTiles" className="peer sr-only" />
              <span className={cn("h-20 w-24 shrink-0 rounded-xl bg-gradient-to-br", tile.tone)} />
              <span className="peer-checked:text-amber-800">
                <span className="block font-bold">{tile.title}</span>
                <span className="mt-1 block text-sm text-neutral-600">{tile.detail}</span>
              </span>
            </label>
          ))}
        </div>
      </div>
      <YesNoMaybeGrid items={["Replace joists", "Insulation", "New gutters", "New fascia"]} />
      <TextareaBlock label="Any other roof details?" placeholder="Leaks, rotten timber, chimney work, rooflights, neighbour access, matching existing tiles..." />
    </StepShell>
  );
}

function LoftQuestions() {
  return (
    <StepShell eyebrow="Loft details" title="Design the loft brief." intro="These answers help us estimate structure, stairs, rooms, windows and finishing level.">
      <div>
        <h3 className="mb-3 text-lg font-black">What type of loft conversion?</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {loftTypes.map((loft) => (
            <label key={loft.title} className="overflow-hidden rounded-2xl border border-neutral-200 transition hover:border-amber-400 has-[:checked]:border-amber-500 has-[:checked]:bg-amber-50 has-[:checked]:shadow-lg">
              <div className="relative h-32">
                <Image src={loft.image} alt={loft.title} fill className="object-cover" />
              </div>
              <span className="flex gap-3 p-3">
                <input type="radio" name="loftType" className="peer mt-1" required />
                <span>
                  <span className="block font-bold">{loft.title}</span>
                  <span className="text-sm text-neutral-600">{loft.detail}</span>
                </span>
              </span>
            </label>
          ))}
        </div>
      </div>
      <VisualChoiceGrid title="Dormer outside finish" name="dormerFinish" options={dormerFinishes} />
      <ChoiceGrid title="Planning permission" name="loftPlanning" type="radio" required options={["Yes", "No", "Applied", "Would like help with that"]} />
      <FileDrop label="If yes, upload plans" accept=".pdf,.png,.jpg,.jpeg" />
      <YesNoMaybeGrid items={["Need new stairs", "Need RSJs", "Want Velux windows", "Want uPVC windows", "Paint finish"]} />
      <div className="grid gap-4 md:grid-cols-3">
        <SelectLike label="Rooms" options={["1", "2", "3", "I don't know"]} icon={<BedDouble />} />
        <SelectLike label="Bathrooms" options={["1", "2", "I don't know"]} icon={<Bath />} />
        <Field label="Current loft height" placeholder="Value or I don't know" icon={<Ruler />} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="How many Velux windows?" placeholder="e.g. 2, none, or not sure" />
        <Field label="How many uPVC windows?" placeholder="e.g. 1, none, or not sure" />
      </div>
      <BathroomAndFinishQuestions />
    </StepShell>
  );
}

function ExtensionQuestions() {
  return (
    <StepShell eyebrow="Extension details" title="Shape the extension scope." intro="A few choices here help separate shell-only work from full finished living space.">
      <VisualChoiceGrid title="Extension style" name="extensionStyle" options={extensionStyles} required />
      <ChoiceGrid title="Planning status" name="extensionPlanning" type="radio" required options={["Approved", "Not started", "Applied", "Would like help"]} />
      <FileDrop label="Upload drawings or planning documents" accept=".pdf,.png,.jpg,.jpeg" />
      <YesNoMaybeGrid items={["Kitchen included", "Structural steel / RSJs", "Roof lantern", "Bi-fold or sliding doors", "Underfloor heating", "New drainage"]} />
      <BathroomAndFinishQuestions />
      <TextareaBlock label="Anything else for the extension?" placeholder="Open-plan kitchen, utility room, downstairs WC, matching brickwork, skylights, demolition..." />
    </StepShell>
  );
}

function RefurbishmentQuestions() {
  return (
    <StepShell eyebrow="Refurbishment details" title="What rooms are we refreshing?" intro="Tick what should stay in scope. Finishes can be supplied by the client based on their liking.">
      <ChoiceGrid title="Refurbishment size" name="refurbSize" type="radio" required options={["One room", "Kitchen", "Bathroom", "Whole floor", "Whole house"]} />
      <YesNoMaybeGrid items={["Layout changes", "Kitchen install", "Bathroom install", "New flooring", "Rewiring", "Plumbing upgrades", "Plastering", "Decorating"]} />
      <BathroomAndFinishQuestions />
      <TextareaBlock label="Refurbishment notes" placeholder="Remove walls, match existing finishes, repair damp, replace doors, bespoke storage..." />
    </StepShell>
  );
}

function FoundationQuestions() {
  return (
    <StepShell eyebrow="Foundation details" title="Groundwork and structure." intro="Tell us what the foundations are supporting and what access is like.">
      <ChoiceGrid title="Foundation purpose" name="foundationPurpose" type="radio" required options={["Extension", "Outbuilding", "Retaining wall", "Underpinning", "Not sure"]} />
      <YesNoMaybeGrid items={["Structural drawings available", "Engineer calculations available", "Trial holes done", "Drainage nearby", "Concrete pump likely needed"]} />
      <TextareaBlock label="Ground conditions or access notes" placeholder="Clay, trees nearby, slope, shared access, existing concrete, drainage runs..." />
    </StepShell>
  );
}

function GardenQuestions() {
  return (
    <StepShell eyebrow="Garden / driveway details" title="Plan the outside works." intro="This helps us price excavation, waste, drainage and the finish you want.">
      <ChoiceGrid title="Main work" name="gardenWork" type="radio" required options={["Driveway", "Patio", "Garden landscaping", "Fencing", "Drainage", "Mixed works"]} />
      <VisualChoiceGrid title="Preferred finish" name="gardenFinish" options={gardenFinishes} />
      <YesNoMaybeGrid items={["Existing surface removal", "New drainage", "Retaining wall", "New steps", "Lighting", "Side gate / fencing"]} />
      <TextareaBlock label="Garden or driveway notes" placeholder="Parking spaces, levels, water pooling, manholes, planting, edging, access width..." />
    </StepShell>
  );
}

function BathroomAndFinishQuestions() {
  return (
    <>
      <ChoiceGrid title="Bathroom items" name="bathroomItems" options={["Shower", "Bath", "Sink", "Toilet", "Vanity unit", "Heated towel rail", "Not sure"]} />
      <ChoiceGrid title="Bathroom ventilation" name="bathroomVentilation" type="radio" options={["Extractor fan", "No fan", "Not sure", "Company to advise"]} />
      <ChoiceGrid title="Client-supplied finishing materials" name="clientSuppliedFinishes" options={["Bathroom suite", "Tiles", "Flooring", "Light fittings", "Doors", "Ironmongery", "Paint colour / finish coat", "Kitchen units", "None, quote contractor supply", "Not sure"]} />
      <ChoiceGrid title="Flooring" name="flooring" options={["Carpet", "Laminate", "Tiles", "Something else supplied by client", "Not sure"]} />
      <div>
        <h3 className="mb-3 text-lg font-black">Builder work included by default, untick what you do not want</h3>
        <p className="mb-3 text-sm leading-6 text-neutral-600">
          Decorative finishes and personal choice materials are usually supplied by the client unless you ask us to include them.
        </p>
        <div className="grid gap-2 md:grid-cols-2">
          {finishDefaults.map((item) => (
            <label key={item} className="flex items-center gap-3 rounded-xl border border-neutral-200 p-3 text-sm font-semibold has-[:checked]:border-amber-500 has-[:checked]:bg-amber-50">
              <input type="checkbox" defaultChecked />
              {item}
            </label>
          ))}
        </div>
      </div>
      <TextareaBlock label="Other requirements or finish ideas" placeholder="Door supplied by client, specific paint colour, bathroom brand, inspiration links..." />
      <FileDrop label="Upload pictures of ideas you have" accept="image/*" multiple />
    </>
  );
}

function LogisticsStep() {
  return (
    <StepShell eyebrow="Site logistics" title="How should we allow for access and setup?" intro="These items can move a quote a lot, so we ask them before the budget.">
      <ChoiceGrid title="Do you have scaffolding?" name="scaffolding" type="radio" required options={["Yes", "No, contractor to deal with it", "Isn't needed", "Not sure"]} />
      <ChoiceGrid title="Is there space for a skip?" name="skipSpace" type="radio" required options={["Yes", "No", "Maybe with permit", "Not sure"]} />
      <ChoiceGrid title="Building control, if needed" name="buildingControl" type="radio" required options={["I will deal with building control", "I want 2A Construction to handle it", "Not sure if needed", "Already arranged"]} />
      <ChoiceGrid title="Quote type" name="quoteType" type="radio" required options={["Labour only", "Labour + skip + scaffolding + contractor-supplied materials", "Not sure yet"]} />
      <TextareaBlock label="Access details" placeholder="Parking restrictions, narrow roads, rear access, permit needs, working hours..." />
      <FileDrop label="Upload photos of the current space" accept="image/*" multiple />
    </StepShell>
  );
}

function BudgetStep({
  quality,
  cheap,
  fast,
  tradeMood,
  updateTradeSlider,
}: {
  quality: number;
  cheap: number;
  fast: number;
  tradeMood: string;
  updateTradeSlider: (name: "quality" | "cheap" | "fast", value: number) => void;
}) {
  return (
    <StepShell eyebrow="Budget and priorities" title="Set expectations early." intro="A budget range lets us recommend the right specification instead of guessing.">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Overall budget range" placeholder="e.g. GBP 45k-65k" required />
        <SelectLike label="Budget preference" options={["Happy to share range", "Prefer not to say", "Need guidance"]} required />
      </div>
      <div className="rounded-[2rem] border border-neutral-200 bg-neutral-950 p-5 text-white">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-1 h-5 w-5 text-amber-300" />
          <div>
            <h3 className="text-xl font-black">The builder triangle</h3>
            <p className="mt-1 text-sm text-white/70">Quality, cheap and fast are connected. Push one too hard and the others start making faces.</p>
          </div>
        </div>
        <div className="mt-5 space-y-5">
          <TradeSlider label="Quality" value={quality} onChange={(value) => updateTradeSlider("quality", value)} helper="Nicer finish, stronger specification, higher cost." />
          <TradeSlider label="Cheap" value={cheap} onChange={(value) => updateTradeSlider("cheap", value)} helper="Budget-friendly choices, fewer premium details." />
          <TradeSlider label="Fast" value={fast} onChange={(value) => updateTradeSlider("fast", value)} helper="More scheduling pressure, sometimes more cost." />
        </div>
        <div className="mt-5 rounded-2xl bg-amber-400 p-4 text-black">
          <p className="text-sm font-black uppercase tracking-[0.18em]">Estimator says</p>
          <p className="mt-1 text-lg font-black">{tradeMood}</p>
        </div>
      </div>
    </StepShell>
  );
}

function ContactStep() {
  return (
    <StepShell eyebrow="Your details" title="Where should we send the estimate?" intro="No backend is connected yet, so this button only completes the front-end flow for now.">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Full name" placeholder="Your name" required />
        <Field label="Email address" type="email" placeholder="you@example.com" required />
        <Field label="Phone number" type="tel" placeholder="07..." required />
        <SelectLike label="Preferred contact" options={["Email", "Phone", "Either is fine"]} required />
        <Field label="House number" placeholder="e.g. 42" required />
        <Field label="Street" placeholder="Street name" required />
        <Field label="Postcode" placeholder="e.g. N13 4AB" required />
      </div>
      <div className="space-y-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
        <label className="flex gap-3 text-sm font-semibold leading-6 has-[:checked]:text-amber-800">
          <input type="checkbox" required className="mt-1" />
          I agree to the terms and conditions and confirm the information provided is accurate for estimate purposes.
        </label>
        <label className="flex gap-3 text-sm font-semibold leading-6 has-[:checked]:text-amber-800">
          <input type="checkbox" required className="mt-1" />
          I agree that 2A Construction can contact me by email or phone with estimate information and follow-up questions.
        </label>
      </div>
      <TextareaBlock label="Anything you would like to add before sending?" placeholder="Timescale, decision makers, preferred appointment days, important constraints..." />
    </StepShell>
  );
}

function StepShell({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <p className="text-sm font-black uppercase tracking-[0.24em] text-amber-700">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">{title}</h2>
      <p className="mt-4 max-w-3xl text-base leading-7 text-neutral-600">{intro}</p>
      <div className="mt-8 space-y-7">{children}</div>
    </div>
  );
}

function Field({
  label,
  placeholder,
  type = "text",
  icon,
  required = false,
}: {
  label: string;
  placeholder: string;
  type?: string;
  icon?: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-sm font-black text-neutral-800">
        {icon && <span className="[&_svg]:h-4 [&_svg]:w-4 [&_svg]:text-amber-600">{icon}</span>}
        {label}
        {required && <span className="text-amber-700">*</span>}
      </span>
      <Input type={type} placeholder={placeholder} required={required} className="h-12 rounded-2xl border-neutral-300 bg-neutral-50" />
    </label>
  );
}

function TextareaBlock({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-neutral-800">{label}</span>
      <Textarea placeholder={placeholder} className="min-h-32 rounded-2xl border-neutral-300 bg-neutral-50" />
    </label>
  );
}

function SelectLike({ label, options, icon, required = false }: { label: string; options: string[]; icon?: React.ReactNode; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-sm font-black text-neutral-800">
        {icon && <span className="[&_svg]:h-4 [&_svg]:w-4 [&_svg]:text-amber-600">{icon}</span>}
        {label}
        {required && <span className="text-amber-700">*</span>}
      </span>
      <select required={required} className="h-12 w-full rounded-2xl border border-neutral-300 bg-neutral-50 px-3 text-sm shadow-sm outline-none focus:ring-2 focus:ring-amber-400">
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function ChoiceGrid({
  title,
  options,
  name,
  type = "checkbox",
  required = false,
}: {
  title: string;
  options: string[];
  name: string;
  type?: "checkbox" | "radio";
  required?: boolean;
}) {
  return (
    <div>
      <h3 className="mb-3 text-lg font-black">
        {title}
        {required && <span className="ml-1 text-amber-700">*</span>}
      </h3>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label
            key={option}
            className="flex cursor-pointer items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-3 text-sm font-bold transition hover:border-amber-400 has-[:checked]:border-amber-500 has-[:checked]:bg-amber-100 has-[:checked]:shadow-md"
          >
            <input type={type} name={name} value={option} required={required && type === "radio"} />
            {option}
          </label>
        ))}
      </div>
    </div>
  );
}

function VisualChoiceGrid({
  title,
  options,
  name,
  required = false,
}: {
  title: string;
  options: { title: string; image: string; detail: string }[];
  name: string;
  required?: boolean;
}) {
  return (
    <div>
      <h3 className="mb-3 text-lg font-black">
        {title}
        {required && <span className="ml-1 text-amber-700">*</span>}
      </h3>
      <div className="grid gap-3 md:grid-cols-2">
        {options.map((option) => (
          <label key={option.title} className="overflow-hidden rounded-2xl border border-neutral-200 transition hover:border-amber-400 has-[:checked]:border-amber-500 has-[:checked]:bg-amber-50 has-[:checked]:shadow-lg">
            <div className="relative h-32">
              <Image src={option.image} alt={option.title} fill className="object-cover" />
            </div>
            <span className="flex gap-3 p-3">
              <input type="radio" name={name} value={option.title} required={required} className="mt-1" />
              <span>
                <span className="block font-bold">{option.title}</span>
                <span className="text-sm text-neutral-600">{option.detail}</span>
              </span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

function YesNoMaybeGrid({ items }: { items: string[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((item) => (
        <div key={item} className="rounded-2xl border border-neutral-200 p-4">
          <p className="font-black">{item}</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
            {["Yes", "No", "Not sure"].map((answer) => (
              <label key={answer} className="cursor-pointer rounded-full border border-neutral-200 px-3 py-2 text-center font-semibold transition hover:border-amber-400 has-[:checked]:border-amber-500 has-[:checked]:bg-amber-400 has-[:checked]:text-black">
                <input type="radio" name={item} className="sr-only" />
                {answer}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function FileDrop({ label, accept, multiple = false }: { label: string; accept: string; multiple?: boolean }) {
  return (
    <label className="flex cursor-pointer flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-amber-300 bg-amber-50 p-6 text-center hover:bg-amber-100">
      <Upload className="h-8 w-8 text-amber-700" />
      <span className="mt-3 text-base font-black">{label}</span>
      <span className="mt-1 text-sm text-neutral-600">Click to choose {multiple ? "files" : "a file"}.</span>
      <input type="file" accept={accept} multiple={multiple} className="sr-only" />
    </label>
  );
}

function TradeSlider({
  label,
  value,
  helper,
  onChange,
}: {
  label: string;
  value: number;
  helper: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between gap-4">
        <span className="font-black">{label}</span>
        <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-black">{value}%</span>
      </span>
      <input type="range" min="10" max="100" value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-3 w-full accent-amber-400" />
      <span className="mt-1 block text-xs text-white/60">{helper}</span>
    </label>
  );
}

function SuccessState() {
  return (
    <div className="grid min-h-[620px] place-items-center rounded-[2rem] bg-gradient-to-br from-amber-50 to-white p-8 text-center">
      <div className="max-w-xl">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-amber-400 text-black">
          <Check className="h-10 w-10" />
        </div>
        <h2 className="mt-6 text-4xl font-black tracking-tight">Estimator front-end complete.</h2>
        <p className="mt-4 text-lg leading-8 text-neutral-600">
          This confirms the slide form experience works visually. Backend saving, email sending and upload processing can be connected next.
        </p>
        <div className="mt-6 grid gap-3 text-left sm:grid-cols-3">
          {[
            { label: "Brief", Icon: ClipboardList },
            { label: "Photos", Icon: ImagePlus },
            { label: "Build team", Icon: Hammer },
          ].map(({ label, Icon }) => (
            <div key={label} className="rounded-2xl border border-neutral-200 bg-white p-4 text-center">
              <Icon className="mx-auto h-6 w-6 text-amber-700" />
              <p className="mt-2 text-sm font-black">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getTradeMood(quality: number, cheap: number, fast: number) {
  if (quality > 78 && cheap > 70 && fast > 70) {
    return "The unicorn package. Lovely dream, but we should talk before the calculator panics.";
  }

  if (quality > 75) return "Premium finish mode: the quote will favour better materials and cleaner detailing.";
  if (cheap > 75) return "Value hunter mode: we will keep the scope practical and avoid fancy surprises.";
  if (fast > 75) return "Fast lane mode: possible, but scheduling and material availability become the boss.";
  return "Balanced build: sensible specification, sensible programme, fewer headaches.";
}
