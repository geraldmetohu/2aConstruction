"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bath,
  BedDouble,
  Check,
  ChevronDown,
  ClipboardList,
  FileText,
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
import { submitEstimator } from "@/app/actions";

type ProjectType = "extension" | "loft" | "refurbishment" | "roof" | "foundations" | "garden";

const EstimatorUploadDropzone = dynamic(
  () =>
    import("./EstimatorUploadDropzone").then((module) => ({
      default: module.EstimatorUploadDropzone,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-5 text-sm font-semibold text-neutral-500">
        Loading uploader...
      </div>
    ),
  }
);

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
  { id: "foundations", title: "Foundations", summary: "New structural bases, underpinning preparation and groundwork.", image: "/images/estimator/foundations.jpg" },
  { id: "garden", title: "Garden / driveway", summary: "Paving, drainage, fencing, landscaping and parking surfaces.", image: "/images/estimator/resin.jpg" },
];

const roofTiles = [
  { title: "Concrete interlocking", image: "/images/estimator/interlocking.jfif", detail: "Durable and common across UK homes." },
  { title: "Clay plain tiles", image: "/images/estimator/clay_plain_tiles.jfif", detail: "Traditional look with strong kerb appeal." },
  { title: "Slate tiles", image: "/images/estimator/slate_tiles.jpg", detail: "Premium finish for period and modern roofs." },
  { title: "Pantiles", image: "/images/estimator/pantile.jpg", detail: "Curved profile, often used for character roofs." },
];

const flatRoofSystems = [
  { title: "Felt roof", image: "/images/estimator/flat_roof.jfif", detail: "Cost-effective layered system for sheds, garages and flat roofs." },
  { title: "Fibreglass GRP", image: "/images/estimator/fiberglass.jfif", detail: "Seamless rigid finish with a clean modern appearance." },
  { title: "EPDM rubber", image: "/images/estimator/rubber.jpg", detail: "Flexible membrane system, popular for extensions and dormers." },
  { title: "Not sure", image: "/images/estimator/other_flat.jfif", detail: "We can advise after seeing photos and roof access." },
];

const loftTypes = [
  { title: "L-shape dormer", image: "/images/estimator/L_shaped_loft.png", detail: "Great for period properties with rear additions." },
  { title: "Hip-to-gable", image: "/images/estimator/hip_loft.jpg", detail: "Extends the sloped side into a vertical wall." },
  { title: "Velux / rooflight", image: "/images/estimator/velux_loft.png", detail: "Lower disruption where the roof volume already works." },
  { title: "Not sure yet", image: "/images/estimator/not_sure_loft.jpeg", detail: "We can advise after measurements and photos." },
];

const extensionStyles = [
  { title: "Rear extension", image: "/images/estimator/rear.jpg", detail: "Most common for larger kitchen and dining spaces." },
  { title: "Side return", image: "/images/estimator/side_return.jpg", detail: "Uses side alley space to widen the ground floor." },
  { title: "Wrap-around", image: "/images/estimator/Wraparound.jpg", detail: "Combines rear and side return for a bigger layout." },
  { title: "Double storey", image: "/images/estimator/double_storey.png", detail: "Adds upstairs space as well as ground floor space." },
  { title: "Not sure", image: "/images/estimator/other_ext.webp", detail: "We can advise from plans, photos or a site visit." },
];

const dormerFinishes = [
  { title: "Tile hanging", image: "/images/estimator/tile_hanging_loft.jfif", detail: "Classic UK dormer finish, often matched to roof tiles." },
  { title: "Rendering", image: "/images/estimator/rendering_loft.jpg", detail: "Clean rendered finish, usually coloured or painted." },
  { title: "Cladding", image: "/images/estimator/cladding_loft.jpg", detail: "Modern look with composite, timber-style or metal cladding." },
  { title: "Not sure", image: "/images/estimator/other_loft.jfif", detail: "Let us suggest the best finish for the property." },
];

const gardenFinishes = [
  { title: "Block paving", image: "/images/estimator/block_paving.jpg", detail: "Flexible, repairable and common for driveways." },
  { title: "Porcelain tiles", image: "/images/estimator/porcelain_tiles.jpg", detail: "Smart patio finish with a premium look." },
  { title: "Resin", image: "/images/estimator/resin.jpg", detail: "Smooth driveway finish when the base is suitable." },
  { title: "Tarmac", image: "/images/estimator/tarmac.jpg", detail: "Practical surface for parking areas." },
  { title: "Decking", image: "/images/estimator/decking.jpg", detail: "Raised or flush timber/composite decking for outdoor living areas." },
  { title: "Turf / planting", image: "/images/estimator/turf.jfif", detail: "Soft landscaping for gardens." },
  { title: "Not sure", image: "/images/estimator/other_garden.jfif", detail: "We can recommend after seeing levels and drainage." },
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

const budgetMilestones = [
  1000, 2000, 3000, 5000, 7000, 10000, 15000, 20000, 25000, 30000, 35000, 40000,
  45000, 50000, 60000, 70000, 80000, 90000, 100000, 125000, 150000, 175000, 200000,
  250000, 300000, 400000, 500000, 600000, 700000, 800000, 900000, 1000000,
];

const projectUseOptions = [
  "Domestic home",
  "HMO conversion",
  "Buy-to-let upgrade",
  "Commercial / mixed use",
  "Not sure",
];

const preConstructionOptions = [
  "Measured survey",
  "Structural survey",
  "Architect drawings (existing + proposed)",
  "Structural engineer design / steel calculations",
  "Planning permission / lawful development",
  "Building Regulations approval",
  "Party Wall Agreements",
  "Tender + contractor selection help",
];

const preConstructionDeliverables = [
  "CAD drawings",
  "Structural calculations",
  "SAP / energy documents",
  "Drainage plans",
  "Scope / specification pack",
];

const demolitionOptions = [
  "Kitchen strip-out",
  "Bathroom strip-out",
  "Ceilings / floors removal",
  "Remove non-load-bearing walls",
  "Temporary supports / propping",
  "Skips and waste handling",
  "Scaffolding setup",
  "Dust protection / welfare",
];

const structuralScopeOptions = [
  "Foundations / excavation",
  "Cavity walls / superstructure",
  "Structural steel / RSJs",
  "Loft joists and dormer framing",
  "Roof alterations",
  "Large sliders / feature glazing",
];

const sharedFlooringOptions = [
  "Engineered wood",
  "Solid wood",
  "Laminate",
  "Tiles",
  "Carpet",
  "Client to choose later",
];

const finishTierOptions = [
  "Basic / developer grade",
  "Mid / standard residential",
  "High-end / bespoke joinery heavy",
  "Not sure yet",
];

const steps = ["Project", "Measurements", "Details", "Logistics", "Budget", "Contact"];

export function EstimatorForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState(0);
  const [selectedProjectTypes, setSelectedProjectTypes] = useState<ProjectType[]>(["loft"]);
  const [budgetFrom, setBudgetFrom] = useState("");
  const [budgetTo, setBudgetTo] = useState("");
  const [quality, setQuality] = useState(65);
  const [cheap, setCheap] = useState(45);
  const [fast, setFast] = useState(40);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [emailSent, setEmailSent] = useState(true);

  const leadProjectId = selectedProjectTypes[0] ?? "loft";
  const selectedProject = projectTypes.find((item) => item.id === leadProjectId) ?? projectTypes[1];
  const selectedProjectLabels = selectedProjectTypes.map(
    (id) => projectTypes.find((item) => item.id === id)?.title ?? id
  );
  const tradeMood = useMemo(() => getTradeMood(quality, cheap, fast), [quality, cheap, fast]);

  useEffect(() => {
    const top = formRef.current?.getBoundingClientRect().top ?? 0;

    if (step > 0 || top < 0) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [step]);

  function toggleProjectType(value: ProjectType) {
    setSelectedProjectTypes((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    );
  }

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

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validateCurrentStep()) return;

    setSending(true);
    setSubmitError("");

    const result = await submitEstimator(new FormData(event.currentTarget));

    setSending(false);

    if (result.ok) {
      setEmailSent(result.emailSent ?? true);
      setSent(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setSubmitError(result.message);
  }

  function validateCurrentStep() {
    const currentStep = formRef.current?.querySelector<HTMLElement>(`[data-step="${step}"]`);
    if (!currentStep) return true;

    if (step === 0 && selectedProjectTypes.length === 0) {
      setSubmitError("Please choose at least one type of job so we can show the right questions.");
      return false;
    }

    setSubmitError("");

    const requiredFields = Array.from(
      currentStep.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
        "input[required], select[required], textarea[required]"
      )
    );

    const checkedRadioNames = new Set<string>();

    for (const field of requiredFields) {
      if (field instanceof HTMLInputElement && field.type === "radio") {
        if (checkedRadioNames.has(field.name)) continue;
        checkedRadioNames.add(field.name);

        const groupChecked = !!currentStep.querySelector<HTMLInputElement>(
          `input[type="radio"][name="${CSS.escape(field.name)}"]:checked`
        );

        if (!groupChecked) {
          field.setCustomValidity("Please choose one option.");
          field.reportValidity();
          field.setCustomValidity("");
          return false;
        }

        continue;
      }

      if (!field.checkValidity()) {
        field.reportValidity();
        return false;
      }
    }

    return true;
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
                  <p className="text-sm font-semibold text-amber-200">Selected jobs</p>
                  <p className="mt-1 text-2xl font-black">
                    {selectedProjectTypes.length === 0 ? "Choose your project mix" : `${selectedProjectTypes.length} selected`}
                  </p>
                  <p className="mt-2 text-sm text-white/65">{selectedProject.summary}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedProjectLabels.length > 0 ? (
                      selectedProjectLabels.map((label) => (
                        <span key={label} className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-white">
                          {label}
                        </span>
                      ))
                    ) : (
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-white/60">
                        No jobs selected yet
                      </span>
                    )}
                  </div>
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

          <form ref={formRef} onSubmit={submitForm} noValidate className="rounded-[2rem] border border-white/10 bg-white p-4 text-neutral-950 shadow-2xl md:p-8">
            {sent ? (
              <SuccessState emailSent={emailSent} />
            ) : (
              <>
                <input type="hidden" name="projectType" value={selectedProjectLabels.join(", ")} />
                <input type="text" name="company" tabIndex={-1} autoComplete="off" className="hidden" />
                <div className="mb-8">
                  <div className="mb-4 h-2 overflow-hidden rounded-full bg-neutral-200">
                    <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-cyan-400 transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
                  </div>
                  <p className="text-sm font-bold uppercase tracking-[0.25em] text-amber-700">Step {step + 1} of {steps.length}</p>
                </div>

                <div data-step="0" className={step === 0 ? "block" : "hidden"}><ProjectStep selectedProjectTypes={selectedProjectTypes} toggleProjectType={toggleProjectType} /></div>
                <div data-step="1" className={step === 1 ? "block" : "hidden"}><MeasurementStep /></div>
                <div data-step="2" className={step === 2 ? "block" : "hidden"}><ProjectDetailStep selectedProjectTypes={selectedProjectTypes} /></div>
                <div data-step="3" className={step === 3 ? "block" : "hidden"}><LogisticsStep /></div>
                <div data-step="4" className={step === 4 ? "block" : "hidden"}><BudgetStep budgetFrom={budgetFrom} budgetTo={budgetTo} setBudgetFrom={setBudgetFrom} setBudgetTo={setBudgetTo} quality={quality} cheap={cheap} fast={fast} tradeMood={tradeMood} updateTradeSlider={updateTradeSlider} /></div>
                <div data-step="5" className={step === 5 ? "block" : "hidden"}><ContactStep /></div>

                <div className="mt-10 flex flex-col gap-3 border-t border-neutral-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <Button type="button" variant="outline" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0} className="h-12 rounded-full border-neutral-300">
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                  {step < steps.length - 1 ? (
                    <Button type="button" onClick={() => validateCurrentStep() && setStep((current) => Math.min(steps.length - 1, current + 1))} className="h-12 rounded-full bg-neutral-950 px-7 text-white hover:bg-amber-500 hover:text-black">
                      Continue
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button type="submit" disabled={sending} className="h-12 rounded-full bg-amber-500 px-7 text-black hover:bg-amber-400">
                      {sending ? "Sending..." : "Send estimator request"}
                      <Send className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {submitError && (
                  <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                    {submitError}
                  </p>
                )}
              </>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}

function ProjectStep({
  selectedProjectTypes,
  toggleProjectType,
}: {
  selectedProjectTypes: ProjectType[];
  toggleProjectType: (value: ProjectType) => void;
}) {
  return (
    <StepShell
      eyebrow="Choose your work type"
      title="What jobs are we estimating?"
      intro="Clients can choose more than one type of work here. We will open all matching question sections in the next step."
    >
      <div className="grid gap-4 md:grid-cols-2">
        {projectTypes.map((item) => (
          <button
            type="button"
            key={item.id}
            onClick={() => toggleProjectType(item.id)}
            className={cn(
              "group overflow-hidden rounded-3xl border text-left transition hover:-translate-y-1 hover:shadow-xl",
              selectedProjectTypes.includes(item.id) ? "border-amber-500 ring-4 ring-amber-200" : "border-neutral-200"
            )}
          >
            <div className="relative h-40">
              <Image src={item.image} alt={item.title} fill className="object-cover transition duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <span className="absolute bottom-4 left-4 rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-neutral-950">
                {item.title}
              </span>
              {selectedProjectTypes.includes(item.id) && (
                <span className="absolute right-4 top-4 rounded-full bg-amber-400 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-black">
                  Included
                </span>
              )}
            </div>
            <p className="p-4 text-sm leading-6 text-neutral-600">{item.summary}</p>
          </button>
        ))}
      </div>
      <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-amber-700">Estimator logic</p>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          If someone needs an extension, loft and refurbishment together, the form will now ask for all three scopes in one submission.
        </p>
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
        <Field name="houseWidth" label="Rough house width" placeholder="e.g. 6.2 metres or not sure" icon={<Ruler />} required />
        <Field name="houseLength" label="Rough house length" placeholder="e.g. 9.5 metres or not sure" icon={<Ruler />} required />
        <Field name="floorHeight" label="Floor height" placeholder="e.g. 2.4 metres per floor" icon={<Home />} />
        <SelectLike name="measurementConfidence" label="Confidence" options={["Measured roughly", "Not sure", "Please advise from photos"]} required />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <SelectLike name="livingSituation" label="Are you living in the property during works?" options={["Yes", "No", "Partly", "Not sure yet"]} required />
        <SelectLike name="relocationWillingness" label="Would you be willing to relocate during construction?" options={["Yes, if needed", "No, I plan to stay", "Maybe depending on the works", "Not sure yet"]} required />
      </div>
      <TextareaBlock name="measurementNotes" label="Anything unusual about access, structure or measurements?" placeholder="Tell us about narrow alleys, shared walls, sloped ground, previous works, etc." />
    </StepShell>
  );
}

function ProjectDetailStep({ selectedProjectTypes }: { selectedProjectTypes: ProjectType[] }) {
  return (
    <StepShell
      eyebrow="Detailed brief"
      title="Build the full project scope."
      intro="This estimator can now cover multiple work types in one go. We start with the decisions people usually skip, then open a section for each selected job."
    >
      <SharedProjectOverview />
      <PreConstructionQuestions />
      <SiteSetupQuestions />

      {selectedProjectTypes.includes("extension") && <ExtensionQuestions />}
      {selectedProjectTypes.includes("loft") && <LoftQuestions />}
      {selectedProjectTypes.includes("refurbishment") && <RefurbishmentQuestions />}
      {selectedProjectTypes.includes("roof") && <RoofQuestions />}
      {selectedProjectTypes.includes("foundations") && <FoundationQuestions />}
      {selectedProjectTypes.includes("garden") && <GardenQuestions />}

      {(selectedProjectTypes.includes("extension") || selectedProjectTypes.includes("refurbishment")) && (
        <KitchenQuestions />
      )}

      {(selectedProjectTypes.includes("loft") || selectedProjectTypes.includes("extension") || selectedProjectTypes.includes("refurbishment")) && (
        <FlooringQuestions />
      )}

      {(selectedProjectTypes.includes("loft") || selectedProjectTypes.includes("extension") || selectedProjectTypes.includes("refurbishment")) && (
        <BathroomAndFinishQuestions />
      )}

      <ProjectTimelineSummary />
    </StepShell>
  );
}

function SharedProjectOverview() {
  return (
    <DetailPanel
      title="Project overview"
      intro="These answers help us understand who the project is for, what level of finish you expect, and whether there are planning or landlord-style constraints."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <SelectLike name="projectUse" label="Project type / use" options={projectUseOptions} required />
        <SelectLike name="finishTier" label="Finish level" options={finishTierOptions} required />
      </div>
      <ChoiceGrid
        title="Which best describes the job?"
        name="projectCharacter"
        type="radio"
        required
        options={["Structural shell only", "Part-finished build", "Full turn-key project", "Not sure yet"]}
      />
      <ChoiceGrid
        title="Key trades likely involved"
        name="projectTrades"
        options={[
          "Architect",
          "Structural engineer",
          "Builder / main contractor",
          "Groundworkers",
          "Bricklayers",
          "Roofers",
          "Carpenters",
          "Electricians",
          "Plumbers",
          "Plasterers",
          "Tilers",
          "Kitchen fitters",
          "Decorators",
          "Landscapers",
        ]}
      />
      <TextareaBlock
        name="projectOverviewNotes"
        label="Main goals for the project"
        placeholder="For example: create an HMO layout, enlarge the kitchen, add a master suite, bring a rental up to standard, or modernise before moving in."
      />
    </DetailPanel>
  );
}

function PreConstructionQuestions() {
  return (
    <DetailPanel
      title="Pre-construction"
      intro="This phase is often skipped and it is usually the biggest mistake. It can take 6 to 16 weeks on its own."
    >
      <ChoiceGrid
        title="Who is handling the pre-construction phase?"
        name="preConstructionSupport"
        type="radio"
        required
        options={[
          "I already have my own team",
          "I need 2A Construction to help coordinate it",
          "Partly arranged, still need support",
          "Not sure yet",
        ]}
      />
      <ChoiceGrid title="What is already in place?" name="preConstructionScope" options={preConstructionOptions} />
      <OptionalExtras
        title="Advanced pre-construction extras"
        description="These are more specialist items. Only open this if you want to give a more technical brief. It will take a bit more time."
      >
        <ChoiceGrid title="Deliverables available or expected" name="preConstructionDeliverables" options={preConstructionDeliverables} />
      </OptionalExtras>
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        Measured surveys, drawings, steel design, planning and building regulations can move programme and cost early. Knowing what is done already saves a lot of back and forth later.
      </div>
    </DetailPanel>
  );
}

function SiteSetupQuestions() {
  return (
    <DetailPanel
      title="Site setup and demolition"
      intro="We want to know what needs stripping out before the new work starts."
    >
      <ChoiceGrid title="Strip-out and setup scope" name="siteSetupScope" options={demolitionOptions} />
      <OptionalExtras
        title="Advanced temporary support extras"
        description="These are usually for clients who already have drawings or know a bit more about how the job will be built."
      >
        <ChoiceGrid
          title="Temporary works likely needed"
          name="temporaryWorks"
          options={["Acrow props", "Temporary steel support", "Protection to occupied areas", "Neighbour protection", "Not sure"]}
        />
      </OptionalExtras>
      <TextareaBlock
        name="siteSetupNotes"
        label="Anything we should know before site setup?"
        placeholder="Occupied house, tenants in place, limited storage, neighbour issues, dust sensitivity, access through kitchen, etc."
      />
    </DetailPanel>
  );
}

function RoofQuestions() {
  return (
    <DetailPanel title="Roof works" intro="Choose the roof type, finishes and the extra items you want included in the quote.">
      <ChoiceGrid title="Roof type" name="roofType" options={["Pitched roof", "Flat roof", "Roof repair only", "Not sure"]} />
      <VisualChoiceGrid title="If flat roof is included, choose preferred system" name="flatRoofSystem" options={flatRoofSystems} />
      <div>
        <h3 className="mb-3 text-lg font-black">If pitched roof is included, choose tile style</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {roofTiles.map((tile) => (
            <label key={tile.title} className="flex cursor-pointer gap-3 rounded-2xl border border-neutral-200 p-3 transition hover:border-amber-400 has-[:checked]:border-amber-500 has-[:checked]:bg-amber-50 has-[:checked]:shadow-md">
              <input type="checkbox" name="roofTiles" value={tile.title} className="peer sr-only" />
              <span className="relative h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
                <Image src={tile.image} alt={tile.title} fill className="object-cover" />
              </span>
              <span className="peer-checked:text-amber-800">
                <span className="block font-bold">{tile.title}</span>
                <span className="mt-1 block text-sm text-neutral-600">{tile.detail}</span>
              </span>
            </label>
          ))}
        </div>
      </div>
      <ChoiceGrid
        title="Weatherproofing materials"
        name="roofWeatherproofing"
        options={["Breather membrane / felt", "Lead flashing", "New gutters", "New fascia and soffit", "Roof windows", "Drainage connection review", "Not sure"]}
      />
      <YesNoMaybeGrid items={["Replace joists", "Insulation", "New gutters", "New fascia"]} />
      <OptionalExtras
        title="Advanced roof extras"
        description="Open this if you want to include more technical roof information. Most clients skip this part."
      >
        <ChoiceGrid title="Additional roof structure items" name="roofAdvancedScope" options={["Valley work", "Chimney repairs", "Parapet wall detail", "Drainage outlets", "Timber repair", "Not sure"]} />
      </OptionalExtras>
      <TextareaBlock name="roofDetails" label="Any other roof details?" placeholder="Leaks, rotten timber, chimney work, rooflights, neighbour access, matching existing tiles..." />
    </DetailPanel>
  );
}

function LoftQuestions() {
  return (
    <DetailPanel title="Loft conversion" intro="These answers help us estimate structure, stairs, rooms, windows and finishing level.">
      <div>
        <h3 className="mb-3 text-lg font-black">What type of loft conversion?</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {loftTypes.map((loft) => (
            <label key={loft.title} className="overflow-hidden rounded-2xl border border-neutral-200 transition hover:border-amber-400 has-[:checked]:border-amber-500 has-[:checked]:bg-amber-50 has-[:checked]:shadow-lg">
              <div className="relative h-32">
                <Image src={loft.image} alt={loft.title} fill className="object-cover" />
              </div>
              <span className="flex gap-3 p-3">
                <input type="radio" name="loftType" value={loft.title} className="mt-1" required />
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
      <FileDrop name="loftPlans" label="If yes, upload plans" accept=".pdf,.png,.jpg,.jpeg" />
      <ChoiceGrid title="Loft structure scope" name="loftStructureScope" options={["Strip roof", "Install steels", "New joists", "Roof alteration", "Timber framing", "Not sure"]} />
      <OptionalExtras
        title="Advanced loft extras"
        description="This is for clients who already know more about the structure or have spoken with a designer or engineer."
      >
        <ChoiceGrid title="Loft structure materials likely needed" name="loftStructureMaterials" options={["C24 timber joists", "Structural steel", "OSB / ply sheathing", "Fire-rated plasterboard", "PIR insulation", "Not sure"]} />
      </OptionalExtras>
      <YesNoMaybeGrid items={["Need new stairs", "Need RSJs", "Want Velux windows", "Want uPVC windows", "Paint finish"]} />
      <div className="grid gap-4 md:grid-cols-3">
        <SelectLike name="loftRooms" label="Rooms" options={["1", "2", "3", "I don't know"]} icon={<BedDouble />} />
        <SelectLike name="loftBathrooms" label="Bathrooms" options={["1", "2", "I don't know"]} icon={<Bath />} />
        <Field name="currentLoftHeight" label="Current loft height" placeholder="Value or I don't know" icon={<Ruler />} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field name="veluxWindowCount" label="How many Velux windows?" placeholder="e.g. 2, none, or not sure" />
        <Field name="upvcWindowCount" label="How many uPVC windows?" placeholder="e.g. 1, none, or not sure" />
      </div>
      <TextareaBlock name="loftExtraDetails" label="Anything else about the loft?" placeholder="Existing water tanks, awkward chimney positions, storage needs, ensuite ideas, party wall concerns..." />
    </DetailPanel>
  );
}

function ExtensionQuestions() {
  return (
    <DetailPanel title="Extension" intro="This separates shell-only work from full finished living space and highlights the major cost drivers early.">
      <VisualChoiceGrid title="Extension style" name="extensionStyle" options={extensionStyles} required />
      <ChoiceGrid title="Planning status" name="extensionPlanning" type="radio" required options={["Approved", "Not started", "Applied", "Would like help", "Not sure"]} />
      <FileDrop name="extensionPlans" label="Upload drawings or planning documents" accept=".pdf,.png,.jpg,.jpeg" />
      <ChoiceGrid title="Structural works in scope" name="extensionStructuralScope" options={structuralScopeOptions} />
      <OptionalExtras
        title="Advanced extension extras"
        description="These options are more specific. Open them if you already know how the extension is likely to be built."
      >
        <ChoiceGrid title="Wall build-up / external system" name="extensionWallBuildUp" options={["Facing brick", "Render system", "Blockwork inner leaf", "Wall ties + insulation", "Timber frame sections", "Not sure"]} />
        <ChoiceGrid title="Roofing and openings" name="extensionWeatherproofing" options={["New roof structure", "Roof lantern", "Flat roof over part", "Sliding doors", "Bi-fold doors", "Windows and external doors", "Not sure"]} />
      </OptionalExtras>
      <YesNoMaybeGrid items={["Kitchen included", "Structural steel / RSJs", "Roof lantern", "Bi-fold or sliding doors", "Underfloor heating", "New drainage"]} />
      <TextareaBlock name="extensionDetails" label="Anything else for the extension?" placeholder="Open-plan kitchen, utility room, downstairs WC, matching brickwork, skylights, demolition..." />
    </DetailPanel>
  );
}

function RefurbishmentQuestions() {
  return (
    <DetailPanel title="Refurbishment" intro="Use this section for internal upgrades, strip-outs, layout changes and full-house refresh works.">
      <ChoiceGrid title="Refurbishment size" name="refurbSize" type="radio" required options={["One room", "Kitchen", "Bathroom", "Whole floor", "Whole house", "Not sure"]} />
      <YesNoMaybeGrid items={["Layout changes", "Kitchen install", "Bathroom install", "New flooring", "Rewiring", "Plumbing upgrades", "Plastering", "Decorating"]} />
      <ChoiceGrid title="Do you currently have wallpaper?" name="wallpaperPresent" type="radio" required options={["Yes", "No"]} />
      <ChoiceGrid
        title="Wallpaper plan"
        name="wallpaperPlan"
        type="radio"
        required
        options={["Yes, wallpaper needs to be removed", "No, I will keep the wallpaper", "No wallpaper in the property"]}
      />
      <OptionalExtras
        title="Advanced refurbishment extras"
        description="These are for clients who want to give a more technical scope. Most homeowners can leave this collapsed."
      >
        <ChoiceGrid title="Refurbishment structural and compliance items" name="refurbStructureCompliance" options={["Load-bearing wall removal", "RSJs / padstones", "Fire upgrades", "Sound insulation", "Consumer unit upgrade", "Boiler / heating changes", "Not sure"]} />
      </OptionalExtras>
      <TextareaBlock name="refurbishmentNotes" label="Refurbishment notes" placeholder="Remove walls, match existing finishes, repair damp, replace doors, bespoke storage..." />
    </DetailPanel>
  );
}

function FoundationQuestions() {
  return (
    <DetailPanel title="Foundations and structural shell" intro="This is where a large share of the budget goes, especially when excavation, concrete and structure all land together.">
      <ChoiceGrid title="Foundation purpose" name="foundationPurpose" type="radio" required options={["Extension", "Outbuilding", "Retaining wall", "Underpinning", "Not sure"]} />
      <ChoiceGrid title="Foundation and shell scope" name="foundationShellScope" options={["Excavation", "Concrete footings", "Build up to DPC", "Cavity walls", "Insulation", "Load-bearing openings"]} />
      <OptionalExtras
        title="Advanced foundation extras"
        description="These questions are more technical and are best used when drawings, engineer input or soil concerns are already known."
      >
        <ChoiceGrid title="Typical materials expected" name="foundationMaterials" options={["Concrete C25 / C30", "100mm concrete blocks", "140mm concrete blocks", "DPC membrane", "Facing brick", "PIR or mineral wool insulation", "Not sure"]} />
      </OptionalExtras>
      <YesNoMaybeGrid items={["Structural drawings available", "Engineer calculations available", "Trial holes done", "Drainage nearby", "Concrete pump likely needed"]} />
      <TextareaBlock name="foundationNotes" label="Ground conditions or access notes" placeholder="Clay, trees nearby, slope, shared access, existing concrete, drainage runs..." />
    </DetailPanel>
  );
}

function GardenQuestions() {
  return (
    <DetailPanel title="External works" intro="This helps us price excavation, waste, drainage and the outside finish you want after the main building work.">
      <ChoiceGrid title="Main work" name="gardenWork" type="radio" required options={["Driveway", "Patio", "Garden landscaping", "Fencing", "Drainage", "Mixed works"]} />
      <VisualChoiceGrid title="Preferred finish" name="gardenFinish" options={gardenFinishes} />
      <ChoiceGrid title="External works scope" name="externalWorksScope" options={["Patio / paving", "Decking", "Fencing", "Turf or artificial grass", "Drainage / soakaways", "Driveway"]} />
      <OptionalExtras
        title="Advanced external works extras"
        description="Open this only if you want to add more technical landscaping or drainage information."
      >
        <ChoiceGrid title="Materials likely to be needed" name="externalWorksMaterials" options={["Porcelain slabs", "Natural stone", "Timber decking", "Composite decking", "Topsoil and turf", "Gravel and drainage pipes", "Not sure"]} />
      </OptionalExtras>
      <YesNoMaybeGrid items={["Existing surface removal", "New drainage", "Retaining wall", "New steps", "Lighting", "Side gate / fencing"]} />
      <TextareaBlock name="gardenNotes" label="Garden or driveway notes" placeholder="Parking spaces, levels, water pooling, manholes, planting, edging, access width..." />
    </DetailPanel>
  );
}

function KitchenQuestions() {
  return (
    <DetailPanel title="Kitchen" intro="This section appears for extensions and refurbishments because kitchens are usually one of the biggest budget drivers.">
      <ChoiceGrid title="Kitchen scope" name="kitchenScope" options={["New kitchen layout", "Keep layout, replace units", "Appliances included", "Utility area", "Island / breakfast bar", "Worktop upgrade", "Not sure"]} />
      <ChoiceGrid title="Kitchen materials / finishes" name="kitchenMaterials" options={["Laminate worktops", "Quartz worktops", "Granite worktops", "MDF cabinets", "Plywood / premium cabinets", "Client to supply kitchen", "Not sure"]} />
      <ChoiceGrid title="Kitchen services" name="kitchenServices" options={["Extra sockets", "New lighting layout", "Extractor / ventilation", "Boiler relocation", "Underfloor heating", "Drainage changes", "Not sure"]} />
      <TextareaBlock name="kitchenNotes" label="Kitchen notes" placeholder="Preferred style, appliance brands, tall housing units, pantry, splashback, utility joinery..." />
      <SupplyNote area="kitchen and joinery finishes" />
    </DetailPanel>
  );
}

function FlooringQuestions() {
  return (
    <DetailPanel title="Flooring" intro="Flooring questions appear for loft, extension and refurbishment so the client answers them wherever that finish matters.">
      <ChoiceGrid title="Flooring type" name="flooringType" options={sharedFlooringOptions} />
      <ChoiceGrid title="Floor build-up / prep" name="flooringBuildUp" options={["Underlay", "Screed", "Floor levelling", "Adhesives", "Acoustic layer", "Client to decide later", "Not sure"]} />
      <ChoiceGrid title="Where is flooring needed?" name="flooringAreas" options={["Bedrooms", "Hallway / landing", "Living areas", "Kitchen", "Bathroom", "Whole project"]} />
      <TextareaBlock name="flooringNotes" label="Flooring notes" placeholder="Existing floor condition, underfloor heating, herringbone preference, tile size, skirting replacement..." />
      <SupplyNote area="flooring finishes" />
    </DetailPanel>
  );
}

function BathroomAndFinishQuestions() {
  return (
    <DetailPanel title="Bathrooms, finishes and second fix" intro="This is where the visible finish level becomes clearer and the quote starts to reflect real product choices.">
      <ChoiceGrid title="Bathroom items" name="bathroomItems" options={["Shower", "Bath", "Sink", "Toilet", "Vanity unit", "Heated towel rail", "Not sure"]} />
      <ChoiceGrid title="Bathroom ventilation" name="bathroomVentilation" type="radio" options={["Extractor fan", "No fan", "Not sure", "Company to advise"]} />
      <ChoiceGrid title="Client-supplied finishing materials" name="clientSuppliedFinishes" options={["Bathroom suite", "Tiles", "Flooring", "Light fittings", "Doors", "Ironmongery", "Paint colour / finish coat", "Kitchen units", "None, quote contractor supply", "Not sure"]} />
      <ChoiceGrid title="Insulation and compliance" name="insulationCompliance" options={["Wall insulation", "Floor insulation", "Roof insulation", "Fire-rated plasterboard", "Sound insulation", "Vapour control layer"]} />
      <ChoiceGrid title="Do you need electrical works?" name="electricalNeeded" type="radio" options={["Yes", "No", "Not sure"]} />
      <YesNoMaybeGrid items={["New sockets", "Rewiring", "Lighting", "Electric shower", "Fuse box", "Smoke alarms", "CCTV / cameras"]} />
      <ChoiceGrid title="Do you need plumbing works?" name="plumbingNeeded" type="radio" options={["Yes", "No", "Not sure"]} />
      <YesNoMaybeGrid items={["Hot and cold pipework", "Soil and waste changes", "Radiators", "Boiler work", "Underfloor heating", "New bathroom plumbing"]} />
      <ChoiceGrid title="Plasterboard and plastering" name="plasteringScope" options={["Standard plasterboard", "Moisture-resistant board", "Fire-rated plasterboard", "Skim coat plaster", "Repairs only", "Not sure"]} />
      <ChoiceGrid title="Doors and joinery" name="doorJoineryScope" options={["Internal doors", "Fire doors", "Door frames", "Skirting boards", "Architraves", "Not sure"]} />
      <ChoiceGrid title="Decoration scope" name="decorationScope" options={["Mist coat + painting", "Feature walls", "Wallpaper", "Woodwork finish", "Skirting and architraves", "Snagging and touch-ups", "Not sure"]} />
      <TextareaBlock name="finishIdeas" label="Other requirements or finish ideas" placeholder="Door supplied by client, specific paint colour, bathroom brand, inspiration links..." />
      <FileDrop name="ideaPhotos" label="Upload pictures or PDFs of ideas you have" accept="image/*,.pdf" multiple />
      <SupplyNote area="bathroom, electrical, plumbing and final finish materials" />
    </DetailPanel>
  );
}

function ProjectTimelineSummary() {
  return (
    <DetailPanel title="How would you like the project to run?" intro="Tell us in plain language what matters most to you so the quote can match the way you want the job managed.">
      <ChoiceGrid
        title="Which timeline feels closest?"
        name="programmeExpectation"
        type="radio"
        options={[
          "I only want early budgeting for now",
          "I want to start design and approvals soon",
          "I want to begin building as soon as possible",
          "I want to phase the works over time",
          "Need advice on what is realistic",
        ]}
      />
      <TextareaBlock
        name="criticalOrder"
        label="Anything important about the order of works?"
        placeholder="For example: keep kitchen usable as long as possible, make the roof watertight first, finish bedrooms before other spaces, or complete outside works at the end."
      />
    </DetailPanel>
  );
}

function LogisticsStep() {
  return (
    <StepShell eyebrow="Site logistics" title="How should we allow for access and setup?" intro="These items can move a quote a lot, so we ask them before the budget.">
      <ChoiceGrid title="Do you have scaffolding?" name="scaffolding" type="radio" required options={["Yes", "No, contractor to deal with it", "Isn't needed", "Not sure"]} />
      <ChoiceGrid title="Is there space for a skip?" name="skipSpace" type="radio" required options={["Yes", "No", "Maybe with permit", "Not sure"]} />
      <ChoiceGrid title="Building control, if needed" name="buildingControl" type="radio" required options={["I will deal with building control", "I want 2A Construction to handle it", "Not sure if needed", "Already arranged"]} />
      <ChoiceGrid title="Quote type" name="quoteType" type="radio" required options={["Labour only", "Labour + skip + scaffolding + contractor-supplied materials", "Not sure yet"]} />
      <div className="grid gap-4 md:grid-cols-2">
        <Field name="preferredStartDate" label="Preferred start time / date" placeholder="e.g. early September, after school holidays, 15/09/2026" required />
        <SelectLike name="startFlexibility" label="How fixed is that start?" options={["Very flexible", "Prefer around that time", "Need that window if possible", "Not sure yet"]} required />
      </div>
      <TextareaBlock name="accessDetails" label="Access details" placeholder="Parking restrictions, narrow roads, rear access, permit needs, working hours..." />
      <FileDrop name="sitePhotos" label="Upload photos or PDFs of the current space" accept="image/*,.pdf" multiple />
    </StepShell>
  );
}

function BudgetStep({
  budgetFrom,
  budgetTo,
  setBudgetFrom,
  setBudgetTo,
  quality,
  cheap,
  fast,
  tradeMood,
  updateTradeSlider,
}: {
  budgetFrom: string;
  budgetTo: string;
  setBudgetFrom: (value: string) => void;
  setBudgetTo: (value: string) => void;
  quality: number;
  cheap: number;
  fast: number;
  tradeMood: string;
  updateTradeSlider: (name: "quality" | "cheap" | "fast", value: number) => void;
}) {
  return (
    <StepShell eyebrow="Budget and priorities" title="Set expectations early." intro="A budget range lets us recommend the right specification instead of guessing.">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-black text-neutral-800">
            Budget starting from
            <span className="ml-1 text-amber-700">*</span>
          </span>
          <select
            name="budgetFrom"
            required
            value={budgetFrom}
            onChange={(event) => setBudgetFrom(event.target.value)}
            className="h-12 w-full rounded-2xl border border-neutral-300 bg-neutral-50 px-3 text-sm shadow-sm outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="" disabled>Select starting budget</option>
            {budgetMilestones.map((value) => (
              <option key={value} value={formatBudgetOption(value)}>{formatBudgetOption(value)}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-black text-neutral-800">
            Budget up to
            <span className="ml-1 text-amber-700">*</span>
          </span>
          <select
            name="budgetTo"
            required
            value={budgetTo}
            onChange={(event) => setBudgetTo(event.target.value)}
            className="h-12 w-full rounded-2xl border border-neutral-300 bg-neutral-50 px-3 text-sm shadow-sm outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="" disabled>Select upper budget</option>
            {budgetMilestones.map((value) => (
              <option key={value} value={formatBudgetOption(value)}>{formatBudgetOption(value)}</option>
            ))}
            <option value="Prefer not to cap budget">Prefer not to cap budget</option>
          </select>
        </label>
        <input type="hidden" name="budgetRange" value={budgetFrom && budgetTo ? `${budgetFrom} to ${budgetTo}` : ""} />
        <SelectLike name="budgetPreference" label="Budget preference" options={["Happy to share range", "Prefer not to say", "Need guidance"]} required />
        <SelectLike name="budgetPressure" label="What matters most about budget?" options={["Keep total cost under control", "Balance cost and finish", "Higher finish is more important", "Need advice"]} required />
      </div>
      <div className="rounded-[2rem] border border-neutral-200 bg-neutral-950 p-5 text-white">
        <input type="hidden" name="qualityPriority" value={quality} />
        <input type="hidden" name="cheapPriority" value={cheap} />
        <input type="hidden" name="fastPriority" value={fast} />
        <div className="flex items-start gap-3">
          <Sparkles className="mt-1 h-5 w-5 text-amber-300" />
          <div>
            <h3 className="text-xl font-black">The builder triangle</h3>
            <p className="mt-1 text-sm text-white/70">Quality, cheap and fast are connected. Push one too hard and the others start making faces.</p>
          </div>
        </div>
        <div className="relative mt-5 overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-4">
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <div className="grid gap-3 md:grid-cols-3">
            {[
              { label: "Quality", value: quality, tone: "from-amber-400 to-yellow-300" },
              { label: "Cheap", value: cheap, tone: "from-cyan-400 to-sky-300" },
              { label: "Fast", value: fast, tone: "from-emerald-400 to-lime-300" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between text-sm font-black">
                  <span>{item.label}</span>
                  <span>{item.value}%</span>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-700 ease-out", item.tone)}
                    style={{ width: `${item.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div
            className="pointer-events-none absolute top-4 h-6 w-6 rounded-full border border-white/40 bg-amber-300/70 blur-[1px] transition-all duration-700 ease-out"
            style={{ left: `${Math.min(92, Math.max(4, quality * 0.92))}%` }}
          />
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
    <StepShell eyebrow="Your details" title="Where should we send the estimate?" intro="Add your contact details so we can save the request and follow up with the next steps.">
      <div className="grid gap-4 md:grid-cols-2">
        <Field name="fullName" label="Full name" placeholder="Your name" required />
        <Field name="email" label="Email address" type="email" placeholder="you@example.com" required />
        <Field name="phone" label="Phone number" type="tel" placeholder="07..." required />
        <SelectLike name="preferredContact" label="Preferred contact" options={["Email", "Phone", "Either is fine"]} required />
        <Field name="houseNumber" label="House number" placeholder="e.g. 42" required />
        <Field name="street" label="Street" placeholder="Street name" required />
        <Field name="postcode" label="Postcode" placeholder="e.g. N13 4AB" required />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <SelectLike name="foundUs" label="Where did you find us?" options={["Google", "Instagram", "Facebook", "Recommendation", "Saw our van/sign", "Existing client", "Other"]} />
        <SelectLike name="startTimeframe" label="When are you looking to start?" options={["Urgent", "Next week", "Next month", "This quarter", "This year", "Not sure"]} />
      </div>
      <div className="space-y-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
        <label className="flex gap-3 text-sm font-semibold leading-6 has-[:checked]:text-amber-800">
          <input type="checkbox" name="termsAccepted" required className="mt-1" />
          I agree to the terms and conditions and confirm the information provided is accurate for estimate purposes.
        </label>
        <label className="flex gap-3 text-sm font-semibold leading-6 has-[:checked]:text-amber-800">
          <input type="checkbox" name="marketingAccepted" required className="mt-1" />
          I agree that 2A Construction can contact me by email or phone with estimate information and follow-up questions.
        </label>
      </div>
      <TextareaBlock name="finalNotes" label="Anything you would like to add before sending?" placeholder="Timescale, decision makers, preferred appointment days, important constraints..." />
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

function DetailPanel({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-neutral-200 bg-neutral-50/80 p-5 md:p-6">
      <div className="max-w-3xl">
        <h3 className="text-2xl font-black tracking-tight text-neutral-950">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-neutral-600">{intro}</p>
      </div>
      <div className="mt-6 space-y-6">{children}</div>
    </section>
  );
}

function OptionalExtras({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group rounded-3xl border border-dashed border-neutral-300 bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.16em] text-amber-700">Optional extras</p>
          <h4 className="mt-1 text-lg font-black text-neutral-900">{title}</h4>
          <p className="mt-1 text-sm leading-6 text-neutral-600">{description}</p>
        </div>
        <ChevronDown className="h-5 w-5 shrink-0 text-neutral-500 transition group-open:rotate-180" />
      </summary>
      <div className="border-t border-neutral-200 p-4 md:p-5">{children}</div>
    </details>
  );
}

function SupplyNote({ area }: { area: string }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
      If you would like us to handle everything, we normally allow for plain standard materials for {area}. Most clients still prefer to choose their own finish materials themselves once layouts and allowances are agreed.
    </div>
  );
}

function Field({
  name,
  label,
  placeholder,
  type = "text",
  icon,
  required = false,
}: {
  name: string;
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
      <Input name={name} type={type} placeholder={placeholder} required={required} className="h-12 rounded-2xl border-neutral-300 bg-neutral-50" />
    </label>
  );
}

function TextareaBlock({ name, label, placeholder }: { name: string; label: string; placeholder: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-neutral-800">{label}</span>
      <Textarea name={name} placeholder={placeholder} className="min-h-32 rounded-2xl border-neutral-300 bg-neutral-50" />
    </label>
  );
}

function SelectLike({ name, label, options, icon, required = false, placeholder }: { name: string; label: string; options: string[]; icon?: React.ReactNode; required?: boolean; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-sm font-black text-neutral-800">
        {icon && <span className="[&_svg]:h-4 [&_svg]:w-4 [&_svg]:text-amber-600">{icon}</span>}
        {label}
        {required && <span className="text-amber-700">*</span>}
      </span>
      <select name={name} required={required} defaultValue={placeholder ? "" : options[0]} className="h-12 w-full rounded-2xl border border-neutral-300 bg-neutral-50 px-3 text-sm shadow-sm outline-none focus:ring-2 focus:ring-amber-400">
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
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
                <input type="radio" name={item} value={answer} className="sr-only" />
                {answer}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function FileDrop({ name, label, accept, multiple = false }: { name: string; label: string; accept: string; multiple?: boolean }) {
  const [files, setFiles] = useState<{ name: string; url?: string; type: string }[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; url: string; type?: string }[]>([]);
  const [uploadError, setUploadError] = useState("");

  useEffect(() => {
    return () => {
      files.forEach((file) => {
        if (file.url) URL.revokeObjectURL(file.url);
      });
    };
  }, [files]);

  function updateFiles(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);

    setFiles((currentFiles) => {
      currentFiles.forEach((file) => {
        if (file.url) URL.revokeObjectURL(file.url);
      });

      return selectedFiles.map((file) => ({
        name: file.name,
        type: file.type,
        url: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      }));
    });
  }

  return (
    <div className="space-y-4">
      <label className="flex cursor-pointer flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-amber-300 bg-gradient-to-br from-amber-50 to-white p-6 text-center transition hover:border-amber-400 hover:bg-amber-100">
        <Upload className="h-8 w-8 text-amber-700" />
        <span className="mt-3 text-base font-black">{label}</span>
        <span className="mt-1 text-sm text-neutral-600">Click to choose {multiple ? "files" : "a file"}.</span>
        <span className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
          Images and PDFs supported
        </span>
        <input type="file" accept={accept} multiple={multiple} onChange={updateFiles} className="sr-only" />
      </label>

      {uploadedFiles.map((file) => (
        <input key={file.url} type="hidden" name={`${name}Urls`} value={file.url} />
      ))}

      {files.length > 0 && (
        <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-black text-neutral-800">Selected files preview</p>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-neutral-600">
              {files.length} selected
            </span>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {files.map((file) => (
              <PreviewCard key={`${file.name}-${file.url ?? "local"}`} file={file} statusLabel="Ready to upload" />
            ))}
          </div>
        </div>
      )}

      <div className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-neutral-800">Upload these files</p>
            <p className="text-xs text-neutral-500">Uploaded files will be attached to the estimator and visible in the admin dashboard.</p>
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
            Fast upload
          </span>
        </div>
        <EstimatorUploadDropzone
          onComplete={(res) => {
            setUploadError("");
            setUploadedFiles(res);
          }}
          onError={setUploadError}
        />
        {uploadedFiles.length > 0 && (
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl bg-green-50 p-3 text-sm font-semibold text-green-700">
              Uploaded {uploadedFiles.length} file{uploadedFiles.length === 1 ? "" : "s"} successfully.
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {uploadedFiles.map((file) => (
                <PreviewCard key={file.url} file={file} statusLabel="Uploaded" href={file.url} />
              ))}
            </div>
          </div>
        )}
        {uploadError && (
          <div className="mt-3 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">
            Upload failed: {uploadError}
          </div>
        )}
      </div>
    </div>
  );
}

function PreviewCard({
  file,
  statusLabel,
  href,
}: {
  file: { name: string; url?: string; type?: string };
  statusLabel: string;
  href?: string;
}) {
  const isImage = !!file.url && (file.type?.startsWith("image/") || /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(file.url));
  const isPdf = file.type === "application/pdf" || /\.pdf($|\?)/i.test(file.url ?? file.name);
  const cardBody = (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition hover:shadow-md">
      {isImage && file.url ? (
        <div className="relative h-36 bg-neutral-100">
          <Image src={file.url} alt={file.name} fill className="object-cover" unoptimized />
        </div>
      ) : (
        <div className="flex h-36 flex-col items-center justify-center gap-3 bg-gradient-to-br from-neutral-100 to-neutral-50 px-4 text-center">
          <div className="rounded-full bg-white p-3 shadow-sm">
            <FileText className="h-7 w-7 text-amber-700" />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
            {isPdf ? "PDF document" : "File attached"}
          </p>
        </div>
      )}
      <div className="space-y-2 p-3">
        <p className="truncate text-sm font-bold text-neutral-800">{file.name}</p>
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-600">
            {statusLabel}
          </span>
          {href && (
            <span className="text-xs font-bold text-amber-700">
              {isPdf ? "Open PDF" : "Open file"}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  if (!href) return cardBody;

  return (
    <a href={href} target="_blank" rel="noreferrer" className="block">
      {cardBody}
    </a>
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

function SuccessState({ emailSent }: { emailSent: boolean }) {
  return (
    <div className="grid min-h-[620px] place-items-center rounded-[2rem] bg-gradient-to-br from-amber-50 to-white p-8 text-center">
      <div className="max-w-xl">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-green-500 text-white">
          <Check className="h-10 w-10" />
        </div>
        <h2 className="mt-6 text-4xl font-black tracking-tight">Your form has been sent.</h2>
        <p className="mt-4 text-lg leading-8 text-neutral-600">
          {emailSent
            ? "We have emailed you a confirmation and sent the new estimator request to the 2A Construction team."
            : "Your request has been saved for the 2A Construction team. The confirmation email could not be sent right now because the email account needs attention."}
          The team will contact you as soon as possible.
        </p>
        <Button asChild className="mt-6 rounded-full bg-neutral-950 text-white hover:bg-amber-500 hover:text-black">
          <Link href="/portfolio/all">In the meantime, see our projects</Link>
        </Button>
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

function formatBudgetOption(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}
