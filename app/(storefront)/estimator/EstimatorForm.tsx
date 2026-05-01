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

type ProjectType = "extension" | "loft" | "refurbishment" | "roof" | "foundations" | "garden" | "demolition" | "newBuild";

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
  { id: "demolition", title: "Demolition / strip-out", summary: "Take-down, soft strip, waste removal and site clearance before new works.", image: "/images/refurb.jpg" },
  { id: "newBuild", title: "New build", summary: "A new house, annexe or full shell and fit-out with trade-by-trade questions.", image: "/images/estimator/foundations.jpg" },
  { id: "foundations", title: "Foundations", summary: "New structural bases, underpinning preparation and groundwork.", image: "/images/estimator/foundations.jpg" },
  { id: "garden", title: "Garden / driveway", summary: "Paving, drainage, fencing, landscaping and parking surfaces.", image: "/images/estimator/resin.jpg" },
];

const bedroomOptions = ["Studio / none", "1", "2", "3", "4", "5", "6+", "Not sure"];

const roofTypeOptions = ["Pitched roof", "Flat roof"];

const extensionDoorOptions = ["Bi-fold doors", "French doors", "Sliding doors", "Standard patio doors", "Other", "Not sure"];

const floorFinishOptions = ["Laminate", "Vinyl", "Tiling", "Wood floor", "Resin", "Carpet", "Other", "Not sure"];

const electricalFinishOptions = ["Pendant lights", "Spotlights", "LED strip lighting", "Wall lights", "Other", "Not sure"];

const roomCountOptions = Array.from({ length: 21 }, (_, index) => `${index}`);

const bathroomCountOptions = Array.from({ length: 11 }, (_, index) => `${index}`);

const livingCountOptions = Array.from({ length: 6 }, (_, index) => `${index}`);

const refurbishmentFloors = ["Ground floor", "First floor", "Second floor", "Loft level", "Basement", "Whole house"];

const windowTypeOptions = ["uPVC casement", "Sash", "Tilt and turn", "Aluminium", "Timber", "Rooflight", "Other", "Not sure"];

const doorTypeOptions = ["Fire door", "Standard internal door", "Pocket door", "Bi-fold internal door", "Composite front door", "uPVC back door", "French door", "Sliding door", "Other", "Not sure"];
const uploadAccept = "image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.rtf,.odt,.ods,.zip";

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

const projectStageOptions = [
  "1. Researching options",
  "2. Planning and budgeting",
  "3. Already have the plans",
  "4. Have the permissions",
  "5. Looking for the builder to start",
];

const steps = ["Project", "Measurements", "Details", "Logistics", "Budget", "Contact"];
const budgetRangeOptions = buildBudgetRangeOptions();

export function EstimatorForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState(0);
  const [selectedProjectTypes, setSelectedProjectTypes] = useState<ProjectType[]>([]);
  const [budgetRange, setBudgetRange] = useState("");
  const [quality, setQuality] = useState(65);
  const [cheap, setCheap] = useState(45);
  const [fast, setFast] = useState(40);
  const [priorityHistory, setPriorityHistory] = useState<Array<"quality" | "cheap" | "fast">>(["quality", "cheap"]);
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
    setSelectedProjectTypes((current) => {
      if (current.includes(value)) {
        return current.filter((item) => item !== value);
      }

      const next = current.filter((item) => {
        if (value === "loft" && item === "roof") return false;
        if (value === "roof" && item === "loft") return false;
        return true;
      });

      return [...next, value];
    });
  }

  function updateTradeSlider(name: "quality" | "cheap" | "fast", value: number) {
    const nextHistory = [...priorityHistory.filter((item) => item !== name), name].slice(-2);
    const values: Record<"quality" | "cheap" | "fast", number> = {
      quality,
      cheap,
      fast,
      [name]: value,
    };

    const otherKeys = (["quality", "cheap", "fast"] as const).filter((key) => key !== name);
    const secondaryKey = otherKeys.find((key) => nextHistory[nextHistory.length - 2] === key) ?? otherKeys[0];
    const tertiaryKey = otherKeys.find((key) => key !== secondaryKey) ?? otherKeys[1];

    let secondaryValue = values[secondaryKey];
    const maxSecondary = Math.max(0, 130 - value);

    if (secondaryValue > maxSecondary) {
      secondaryValue = maxSecondary;
    }

    values[secondaryKey] = secondaryValue;

    const tertiaryValue = Math.max(0, 130 - value - secondaryValue);

    values[tertiaryKey] = tertiaryValue;

    if (name === "quality") setQuality(value);
    if (name === "cheap") setCheap(value);
    if (name === "fast") setFast(value);

    if (secondaryKey === "quality") setQuality(secondaryValue);
    if (secondaryKey === "cheap") setCheap(secondaryValue);
    if (secondaryKey === "fast") setFast(secondaryValue);

    if (tertiaryKey === "quality") setQuality(tertiaryValue);
    if (tertiaryKey === "cheap") setCheap(tertiaryValue);
    if (tertiaryKey === "fast") setFast(tertiaryValue);

    setPriorityHistory(nextHistory);
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
    const requiredCheckboxGroups = Array.from(
      currentStep.querySelectorAll<HTMLElement>("[data-required-checkbox-group]")
    );

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

    for (const group of requiredCheckboxGroups) {
      const hasChecked = !!group.querySelector<HTMLInputElement>('input[type="checkbox"]:checked');

      if (!hasChecked) {
        const message = group.dataset.requiredCheckboxGroup || "Please choose at least one option.";
        setSubmitError(message);
        group.scrollIntoView({ behavior: "smooth", block: "center" });
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
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <Button type="button" variant="outline" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0} className="h-11 rounded-full border-neutral-300">
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </Button>
                    <p className="text-right text-sm font-bold uppercase tracking-[0.25em] text-amber-700">Step {step + 1} of {steps.length}</p>
                  </div>
                  <div className="mb-4 h-2 overflow-hidden rounded-full bg-neutral-200">
                    <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-cyan-400 transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
                  </div>
                </div>

                <div data-step="0" className={step === 0 ? "block" : "hidden"}><ProjectStep selectedProjectTypes={selectedProjectTypes} toggleProjectType={toggleProjectType} /></div>
                <div data-step="1" className={step === 1 ? "block" : "hidden"}><MeasurementStep selectedProjectTypes={selectedProjectTypes} /></div>
                <div data-step="2" className={step === 2 ? "block" : "hidden"}><ProjectDetailStep selectedProjectTypes={selectedProjectTypes} /></div>
                <div data-step="3" className={step === 3 ? "block" : "hidden"}><LogisticsStep /></div>
                <div data-step="4" className={step === 4 ? "block" : "hidden"}><BudgetStep budgetRange={budgetRange} setBudgetRange={setBudgetRange} quality={quality} cheap={cheap} fast={fast} tradeMood={tradeMood} updateTradeSlider={updateTradeSlider} /></div>
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
      intro="Choose one or more jobs. We will then show only the trade questions that match your project mix."
    >
      <div className="grid gap-4 md:grid-cols-2">
        {projectTypes.map((item) => (
          (() => {
            const disabled =
              (item.id === "roof" && selectedProjectTypes.includes("loft")) ||
              (item.id === "loft" && selectedProjectTypes.includes("roof"));

            return (
              <button
                type="button"
                key={item.id}
                disabled={disabled}
                onClick={() => toggleProjectType(item.id)}
                className={cn(
                  "group overflow-hidden rounded-3xl border text-left transition hover:-translate-y-1 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 disabled:hover:shadow-none",
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
                <div className="p-4">
                  <p className="text-sm leading-6 text-neutral-600">{item.summary}</p>
                  {disabled && (
                    <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-rose-600">
                      Choose either roof works or loft conversion, not both.
                    </p>
                  )}
                </div>
              </button>
            );
          })()
        ))}
      </div>
      <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-amber-700">Estimator logic</p>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          You can combine jobs like extension, refurbishment and garden works in one submission. Loft conversion and roof-only works stay separate so the brief stays clear.
        </p>
      </div>
    </StepShell>
  );
}

function MeasurementStep({ selectedProjectTypes }: { selectedProjectTypes: ProjectType[] }) {
  return (
    <StepShell
      eyebrow="Basic measurements"
      title="Tell us the rough size and layout."
      intro="Approximate dimensions are enough. We only show the size fields that matter to the works you selected."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Field name="houseWidth" label="Rough house width" placeholder="e.g. 6.2 metres or not sure" icon={<Ruler />} required />
        <Field name="houseLength" label="Rough house length" placeholder="e.g. 9.5 metres or not sure" icon={<Ruler />} required />
        <Field name="floorHeight" label="Floor height" placeholder="e.g. 2.4 metres per floor" icon={<Home />} />
        <SelectLike name="measurementConfidence" label="Confidence" options={["Measured roughly", "Not sure", "Please advise from photos"]} required />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <SelectLike name="livingSituation" label="Are you living in the property during works?" options={["Yes", "No", "Partly", "Not sure yet"]} required />
        <SelectLike name="relocationWillingness" label="Would you be willing to relocate during construction?" options={["Yes, if needed", "No, I plan to stay", "Maybe depending on the works", "Not sure yet"]} required />
      </div>
      <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-amber-700">Estimator pricing placeholders</p>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          We will save square metre fields and bedroom counts with this request. Example hidden pricing placeholders are included in the form so your formula can be added later without changing the saved data shape.
        </p>
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

      {selectedProjectTypes.includes("extension") && <ExtensionQuestions />}
      {selectedProjectTypes.includes("loft") && <LoftQuestions />}
      {selectedProjectTypes.includes("refurbishment") && <RefurbishmentQuestions />}
      {selectedProjectTypes.includes("roof") && !selectedProjectTypes.includes("loft") && <RoofQuestions />}
      {selectedProjectTypes.includes("demolition") && <DemolitionQuestions />}
      {selectedProjectTypes.includes("newBuild") && <NewBuildQuestions />}
      {selectedProjectTypes.includes("foundations") && <FoundationQuestions />}
      {selectedProjectTypes.includes("garden") && <GardenQuestions />}
    </StepShell>
  );
}

function SharedProjectOverview() {
  const [mainPriorities, setMainPriorities] = useState<string[]>(["High quality"]);

  return (
    <DetailPanel
      title="Project overview"
      intro="These answers help us understand what stage you are at, what level of finish you expect, and what matters most for the quote."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <SelectLike name="projectUse" label="Project type / use" options={projectUseOptions} required />
        <SelectLike name="finishTier" label="Finish level" options={finishTierOptions} required />
      </div>
      <SelectLike name="projectStage" label="What phase are you in?" options={projectStageOptions} required />
      <CheckboxCardGroup
        title="What matters most to you?"
        name="programmeExpectation"
        options={["High quality", "Low price", "Fast starting date", "Only early budgeting", "Other"]}
        selected={mainPriorities}
        onToggle={(value) => setMainPriorities((current) => toggleArrayValue(current, value))}
      />
      {mainPriorities.includes("Other") && (
        <TextareaBlock
          name="programmeExpectationOther"
          label="Tell us what else matters most"
          placeholder="For example: keep the house usable, work around tenants, complete before a move-in date, or phase the work room by room."
        />
      )}
      <TextareaBlock
        name="projectOverviewNotes"
        label="Main goals for the project"
        placeholder="For example: create an HMO layout, enlarge the kitchen, add a master suite, bring a rental up to standard, or modernise before moving in."
      />
    </DetailPanel>
  );
}

function RoofQuestions() {
  const [roofTypes, setRoofTypes] = useState<string[]>([]);

  const pitchedSelected = roofTypes.includes("Pitched roof");
  const flatSelected = roofTypes.includes("Flat roof");

  return (
    <DetailPanel title="Roof works" intro="Choose the roof types you want priced. If you only select one roof type, we only show the questions that matter to that type.">
      <Field name="roofAreaM2" label="Roof area (m²)" placeholder="e.g. 60 or not sure" />
      <CheckboxCardGroup
        title="Which roof areas need work?"
        name="roofType"
        options={roofTypeOptions}
        selected={roofTypes}
        onToggle={(value) => setRoofTypes((current) => toggleArrayValue(current, value))}
      />
      <SegmentedField name="roofRepairLevel" label="What do you need?" options={["Full replacement", "Partial renewal", "Repair only", "Not sure"]} defaultValue="Full replacement" />
      {pitchedSelected && (
        <div className="space-y-6 rounded-3xl border border-neutral-200 bg-white p-4">
          <VisualCheckboxGrid title="Pitched roof covering" name="roofTiles" options={roofTiles} />
          <ChoiceGrid title="Pitched roof extras" name="pitchedRoofExtras" options={["Breather membrane / felt", "Lead flashing", "Rooflights", "Dry ridge system", "Dry verge", "Not sure"]} />
        </div>
      )}
      {flatSelected && (
        <div className="space-y-6 rounded-3xl border border-neutral-200 bg-white p-4">
          <VisualChoiceGrid title="Flat roof membrane" name="flatRoofSystem" options={flatRoofSystems} />
          <ChoiceGrid title="Flat roof extras" name="flatRoofExtras" options={["New decking / boards", "Insulation upgrade", "New outlets", "Parapet detail", "Rooflights", "Not sure"]} />
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <SegmentedField name="roofInsulation" label="Insulation" options={["Yes", "No", "Not sure"]} defaultValue="Not sure" />
        <SegmentedField name="roofJoists" label="Replace joists / timber repairs" options={["Yes", "No", "Not sure"]} defaultValue="Not sure" />
        <SegmentedField name="roofNewGutters" label="New gutters" options={["Yes", "No", "Not sure"]} defaultValue="Not sure" />
        <SegmentedField name="roofNewFascia" label="New fascia / soffit" options={["Yes", "No", "Not sure"]} defaultValue="Not sure" />
      </div>
      <TextareaBlock name="roofDetails" label="Additional roof details" placeholder="Leaks, moss, rotten timber, chimney work, parapet issues, access, neighbour side, matching tiles..." />
      <FileDrop name="roofPhotos" label="Upload roof photos, reports or PDFs" accept={uploadAccept} multiple />
      <SupplyNote area="roof coverings, trims and visible rainwater goods" />
    </DetailPanel>
  );
}

function LoftQuestions() {
  const [loftRoofTypes, setLoftRoofTypes] = useState<string[]>([]);
  const [loftKitchen, setLoftKitchen] = useState("No");
  const [loftBathroom, setLoftBathroom] = useState("No");
  const [veluxChoice, setVeluxChoice] = useState("Not sure");
  const [loftFlooring, setLoftFlooring] = useState<string[]>([]);

  return (
    <DetailPanel title="Loft conversion" intro="This section focuses on the rooms, finishes and trade choices clients usually care about most in a loft conversion.">
      <VisualChoiceGrid title="Loft type" name="loftType" options={loftTypes} required />
      <CheckboxCardGroup
        title="Existing roof types on the loft"
        name="loftRoofType"
        options={roofTypeOptions}
        selected={loftRoofTypes}
        onToggle={(value) => setLoftRoofTypes((current) => toggleArrayValue(current, value))}
      />
      {loftRoofTypes.includes("Pitched roof") && <VisualCheckboxGrid title="Pitched roof covering for the loft" name="loftRoofTiles" options={roofTiles} />}
      {loftRoofTypes.includes("Flat roof") && <VisualChoiceGrid title="Flat roof membrane for dormer / flat sections" name="loftFlatRoofSystem" options={flatRoofSystems} />}
      <VisualChoiceGrid title="Dormer outside finish" name="dormerFinish" options={dormerFinishes} />
      <SegmentedField name="loftPlanning" label="Planning status" options={["Yes", "No", "Applied", "Would like help", "Not sure"]} defaultValue="Not sure" />
      <FileDrop name="loftPlans" label="Upload loft plans, ideas or PDFs" accept={uploadAccept} multiple />
      <div className="grid gap-4 md:grid-cols-3">
        <SelectLike name="loftRooms" label="Rooms" options={["1", "2", "3", "I don't know"]} icon={<BedDouble />} />
        <SelectLike name="loftBathrooms" label="Bathrooms" options={["1", "2", "I don't know"]} icon={<Bath />} />
        <Field name="currentLoftHeight" label="Current loft height" placeholder="Value or I don't know" icon={<Ruler />} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <SegmentedField name="loftStaircase" label="Do you need a staircase?" options={["Yes", "No", "Not sure"]} defaultValue="Yes" />
        <SegmentedField name="loftKitchen" label="Kitchen in the loft?" options={["Yes", "No", "Not sure"]} value={loftKitchen} onChange={setLoftKitchen} defaultValue="No" />
        <SegmentedField name="loftBathroom" label="Bathroom in the loft?" options={["Yes", "No", "Not sure"]} value={loftBathroom} onChange={setLoftBathroom} defaultValue="No" />
        <SegmentedField name="loftVelux" label="Velux windows?" options={["Yes", "No", "Not sure"]} value={veluxChoice} onChange={setVeluxChoice} defaultValue="Not sure" />
      </div>
      {loftKitchen === "Yes" && <SegmentedField name="loftKitchenType" label="Kitchen scope" options={["New kitchen", "Move existing kitchen", "Kitchenette", "Not sure"]} defaultValue="New kitchen" />}
      {loftBathroom === "Yes" && (
        <div className="grid gap-4 md:grid-cols-2">
          <SegmentedField name="loftBathroomType" label="Bathroom type" options={["Shower room", "Bathroom with bath", "Both bath and shower", "Not sure"]} defaultValue="Shower room" />
          <SegmentedField name="loftBathroomTiling" label="Bathroom tiling" options={["Fully tiled", "Bath / shower area only", "Client to decide later", "Not sure"]} defaultValue="Bath / shower area only" />
        </div>
      )}
      {veluxChoice === "Yes" && <SelectLike name="veluxWindowCount" label="How many Velux windows?" options={["1", "2", "3", "4", "5+", "Not sure"]} />}
      <div className="grid gap-4 md:grid-cols-2">
        <SelectLike name="loftOtherWindows" label="How many other windows?" options={["0", "1", "2", "3", "4+", "Not sure"]} />
        <SegmentedField name="loftFuseBox" label="New fuse box for the loft?" options={["Yes", "No", "Up to the builder", "Not sure"]} defaultValue="Up to the builder" />
      </div>
      <CheckboxCardGroup
        title="Flooring in the loft"
        name="loftFlooring"
        options={floorFinishOptions}
        selected={loftFlooring}
        onToggle={(value) => setLoftFlooring((current) => toggleArrayValue(current, value))}
      />
      {loftFlooring.includes("Other") && <TextareaBlock name="loftFlooringOther" label="Other loft flooring preference" placeholder="Microcement, parquet, luxury vinyl, reclaimed boards..." />}
      <ChoiceGrid title="Electrical finish in the loft" name="loftElectricalFinish" options={electricalFinishOptions} />
      <div className="grid gap-4 md:grid-cols-2">
        <SegmentedField name="loftFireAlarm" label="Fire alarms" options={["Yes", "No", "Not sure"]} defaultValue="Yes" />
        <SegmentedField name="loftPainting" label="Painting" options={["Yes", "No", "Not sure"]} defaultValue="Yes" />
        <SegmentedField name="loftDecorations" label="Decorative finishes" options={["Yes", "No", "Not sure"]} defaultValue="Not sure" />
        <SegmentedField name="loftDrainage" label="Drainage changes" options={["Yes", "No", "Not sure"]} defaultValue="Not sure" />
      </div>
      <ChoiceGrid title="Joinery and external items" name="loftJoineryItems" options={["Architraves", "Skirting", "Door hanging", "Guttering", "Fascia", "Internal doors", "Fire doors", "Not sure"]} />
      <TextareaBlock name="loftExtraDetails" label="Additional loft information" placeholder="Storage needs, headroom concerns, awkward chimney positions, preferred layout, party wall notes, ideas for study or bedroom use..." />
      <FileDrop name="loftIdeaFiles" label="Upload loft inspiration, plans or photos" accept={uploadAccept} multiple />
      <SupplyNote area="loft bathroom, joinery and decorative finish materials" />
    </DetailPanel>
  );
}

function ExtensionQuestions() {
  const [existingExtension, setExistingExtension] = useState("No");
  const [extensionKitchen, setExtensionKitchen] = useState("Yes");
  const [rooflights, setRooflights] = useState("Not sure");
  const [doorChoice, setDoorChoice] = useState("Bi-fold doors");
  const [extensionRoofTypes, setExtensionRoofTypes] = useState<string[]>([]);
  const [extensionFlooring, setExtensionFlooring] = useState<string[]>([]);
  const [extensionElectrical, setExtensionElectrical] = useState<string[]>([]);

  return (
    <DetailPanel title="Extension" intro="We ask the extension questions in the order most clients think about the finished space: what it is, what goes in it, and how it should look.">
      <VisualChoiceGrid title="Extension style" name="extensionStyle" options={extensionStyles} required />
      <div className="grid gap-4 md:grid-cols-2">
        <Field name="extensionWidth" label="Extension width" placeholder="e.g. 3.4 metres or not sure" required />
        <Field name="extensionLength" label="Extension length" placeholder="e.g. 6.2 metres or not sure" required />
        <Field name="extensionAreaM2" label="Extension area (m²)" placeholder="e.g. 25 or not sure" />
      </div>
      <SegmentedField name="extensionPlanning" label="Planning status" options={["Approved", "Not started", "Applied", "Would like help", "Not sure"]} defaultValue="Not sure" />
      <SegmentedField name="existingExtensionToRemove" label="Is there an existing extension to demolish?" options={["Yes", "No", "Not sure"]} value={existingExtension} onChange={setExistingExtension} defaultValue="No" />
      {existingExtension === "Yes" && <TextareaBlock name="extensionDemolitionDetails" label="Existing extension demolition details" placeholder="Single skin lean-to, conservatory, old kitchen extension, asbestos concerns, waste route..." />}
      <SegmentedField name="extensionKitchen" label="Do you want to install a kitchen?" options={["Yes", "No", "Not sure"]} value={extensionKitchen} onChange={setExtensionKitchen} defaultValue="Yes" />
      {extensionKitchen === "Yes" && <SegmentedField name="extensionKitchenType" label="Kitchen type" options={["New kitchen", "Move existing kitchen", "Keep existing elsewhere", "Not sure"]} defaultValue="New kitchen" />}
      <SegmentedField name="extensionRooflights" label="Do you want rooflights?" options={["Yes", "No", "Not sure"]} value={rooflights} onChange={setRooflights} defaultValue="Not sure" />
      {rooflights === "Yes" && (
        <div className="grid gap-4 md:grid-cols-2">
          <SelectLike name="extensionRooflightCount" label="How many rooflights?" options={["1", "2", "3", "4", "5+", "Not sure"]} />
          <TextareaBlock name="extensionRooflightDetails" label="Rooflight details" placeholder="Large lantern, slimline, opening rooflights, blackout blinds, matching size..." />
        </div>
      )}
      <SegmentedField name="extensionDoorPreference" label="Main rear door style" options={extensionDoorOptions} value={doorChoice} onChange={setDoorChoice} defaultValue="Bi-fold doors" />
      {doorChoice === "Other" && <TextareaBlock name="extensionDoorOther" label="Tell us the door style" placeholder="Crittall-style, timber doors, oversized pivot, corner slider..." />}
      <CheckboxCardGroup
        title="Extension roof types"
        name="extensionRoofType"
        options={roofTypeOptions}
        selected={extensionRoofTypes}
        onToggle={(value) => setExtensionRoofTypes((current) => toggleArrayValue(current, value))}
      />
      {extensionRoofTypes.includes("Pitched roof") && <VisualCheckboxGrid title="Pitched roof covering" name="extensionRoofTiles" options={roofTiles} />}
      {extensionRoofTypes.includes("Flat roof") && <VisualChoiceGrid title="Flat roof membrane" name="extensionFlatRoofSystem" options={flatRoofSystems} />}
      <div className="grid gap-4 md:grid-cols-2">
        <SegmentedField name="extensionWallType" label="Main wall finish" options={["Brickwork", "Blockwork", "Mixed / to be rendered", "Not sure"]} defaultValue="Brickwork" />
        <SegmentedField name="extensionRender" label="Rendering outside?" options={["Yes", "No", "Not sure"]} defaultValue="Not sure" />
        <SegmentedField name="extensionHeating" label="Heating preference" options={["Underfloor heating", "Radiators only", "Both", "Not sure"]} defaultValue="Underfloor heating" />
        <SegmentedField name="extensionOpenPlan" label="Open-plan layout?" options={["Yes", "No", "Not sure"]} defaultValue="Yes" />
      </div>
      <CheckboxCardGroup
        title="Electrical finish"
        name="extensionElectricalFinish"
        options={electricalFinishOptions}
        selected={extensionElectrical}
        onToggle={(value) => setExtensionElectrical((current) => toggleArrayValue(current, value))}
      />
      {extensionElectrical.includes("Other") && <TextareaBlock name="extensionElectricalOther" label="Other electrical requirements" placeholder="Pendant cluster over island, wall washers, speaker points, garden sockets..." />}
      <CheckboxCardGroup
        title="Flooring choice"
        name="extensionFlooring"
        options={floorFinishOptions}
        selected={extensionFlooring}
        onToggle={(value) => setExtensionFlooring((current) => toggleArrayValue(current, value))}
      />
      {extensionFlooring.includes("Other") && <TextareaBlock name="extensionFlooringOther" label="Other flooring preference" placeholder="Microcement, polished concrete, parquet, terrazzo, reclaimed boards..." />}
      <FileDrop name="extensionFiles" label="Upload extension plans, current photos or ideas" accept={uploadAccept} multiple />
      <TextareaBlock name="extensionDetails" label="Additional extension details" placeholder="Utility room, WC, pantry wall, island seating, garden connection, structural opening size, matching brick, special requests..." />
      <SupplyNote area="extension kitchen, flooring and decorative finishes" />
    </DetailPanel>
  );
}

function RefurbishmentQuestions() {
  const [refurbTrades, setRefurbTrades] = useState<string[]>([]);
  const [refurbKitchenScope, setRefurbKitchenScope] = useState("New kitchen");
  const [frontDoor, setFrontDoor] = useState("No");
  const [backDoor, setBackDoor] = useState("No");
  const [chimneyRemoval, setChimneyRemoval] = useState("No");
  const [wallRemovalCount, setWallRemovalCount] = useState("0");
  const [newWallCount, setNewWallCount] = useState("0");
  const [refurbFlooring, setRefurbFlooring] = useState<string[]>([]);
  const [refurbRendering, setRefurbRendering] = useState("Not sure");
  const [refurbBathroomDetailCount, setRefurbBathroomDetailCount] = useState("0");
  const wallDetailCount = Math.min(
    4,
    Math.max(Number.parseInt(wallRemovalCount, 10) || 0, Number.parseInt(newWallCount, 10) || 0)
  );
  const bathroomDetailCount = Number.parseInt(refurbBathroomDetailCount, 10) || 0;

  return (
    <DetailPanel title="Refurbishment" intro="Use this for room-by-room upgrading, replacing finishes and trade works across an existing home or rental property.">
      <ChoiceGrid title="Refurbishment size" name="refurbSize" type="radio" required options={["One room", "Kitchen", "Bathroom", "Whole floor", "Whole house", "HMO refresh", "Not sure"]} />
      <Field name="refurbishmentAreaM2" label="Refurbishment area (m²)" placeholder="e.g. 70 or not sure" />
      <ChoiceGrid title="Which of the following would you like to carry out?" name="refurbishmentStripOut" options={["Kitchen strip-out", "Bathroom strip-out", "Ceilings removal", "Floor removal", "Remove non-load-bearing walls", "Skips and waste handling", "Scaffolding", "Dust protection", "Not sure"]} />
      <div data-required-checkbox-group="Please choose at least one refurbishment trade you need before continuing.">
        <CheckboxCardGroup
          title="Which trades are needed?"
          name="refurbTrades"
          options={["Kitchen", "Bathroom", "Flooring", "Electrical", "Plumbing", "Plastering", "Decorating", "Doors and joinery", "Windows and doors", "Chimney work", "Wall changes", "Not sure"]}
          selected={refurbTrades}
          onToggle={(value) => setRefurbTrades((current) => toggleArrayValue(current, value))}
        />
      </div>
      <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
        Choose all the trades you need. The matching sections will open below and help you describe each part properly.
      </p>
      <ChoiceGrid title="Which floors are included?" name="refurbishmentFloors" options={refurbishmentFloors} />
      <p className="text-sm font-semibold leading-6 text-neutral-600">
        Choose below roughly how many spaces are involved so we can size the refurbishment more accurately.
      </p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SelectLike name="refurbBedroomsCount" label="How many bedrooms?" options={roomCountOptions} />
        <SelectLike name="refurbBathroomsCount" label="How many bathrooms?" options={bathroomCountOptions} />
        <SelectLike name="refurbKitchensCount" label="How many kitchens?" options={bathroomCountOptions} />
        <SelectLike name="refurbLivingRoomsCount" label="How many living rooms?" options={livingCountOptions} />
        <SelectLike name="refurbDiningRoomsCount" label="How many dining rooms?" options={livingCountOptions} />
        <SelectLike name="refurbStairsCount" label="How many staircases?" options={livingCountOptions} />
      </div>
      <SegmentedField name="wallpaperPresent" label="Do you currently have wallpaper?" options={["Yes", "No", "Not sure"]} defaultValue="Not sure" />
      <SegmentedField name="wallpaperPlan" label="Wallpaper plan" options={["Yes, remove it", "No, keep it", "No wallpaper", "Not sure"]} defaultValue="Not sure" />
      {refurbTrades.includes("Kitchen") && (
        <>
          <SegmentedField name="refurbKitchenScope" label="Kitchen scope" options={["New kitchen", "Move existing kitchen", "Other", "Not sure"]} value={refurbKitchenScope} onChange={setRefurbKitchenScope} defaultValue="New kitchen" />
          {refurbKitchenScope === "Other" && <TextareaBlock name="refurbKitchenScopeOther" label="Other kitchen scope" placeholder="Tell us what you want done with the kitchen." />}
          <TextareaBlock name="refurbKitchenNotes" label="Kitchen additional information" placeholder="Layout changes, island, utility, appliances, worktops, splashback, client-supplied items..." />
        </>
      )}
      {refurbTrades.includes("Electrical") && (
        <>
          <ChoiceGrid title="Electrical works" name="refurbElectrical" options={["New sockets", "Rewiring", "Spotlights", "LED lights", "Pendants", "Fuse box", "Smoke alarms", "CCTV / cameras", "Not sure"]} />
          <TextareaBlock name="refurbElectricalNotes" label="Electrical additional information" placeholder="Extra socket locations, lighting zones, cooker feed, exterior points, data or TV points..." />
        </>
      )}
      {refurbTrades.includes("Plumbing") && (
        <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-4">
          <ChoiceGrid title="Plumbing works" name="refurbPlumbing" options={["Radiators", "Pipework", "Bathroom plumbing", "Boiler work", "Kitchen first fix", "Drainage", "Underfloor heating", "Not sure"]} />
          <TextareaBlock name="refurbPlumbingNotes" label="Plumbing additional information" placeholder="Move boiler, add radiators, underfloor heating zones, waste reroutes, pressure issues..." />
        </div>
      )}
      {refurbTrades.includes("Flooring") && (
        <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-4">
          <CheckboxCardGroup
            title="Flooring type"
            name="refurbFlooring"
            options={[...sharedFlooringOptions, "Vinyl", "Resin", "Other"]}
            selected={refurbFlooring}
            onToggle={(value) => setRefurbFlooring((current) => toggleArrayValue(current, value))}
          />
          <ChoiceGrid title="Where is flooring needed?" name="refurbFlooringAreas" options={["Bedrooms", "Hallway / landing", "Living areas", "Kitchen", "Bathroom", "Whole project"]} />
          {refurbFlooring.includes("Other") && <TextareaBlock name="refurbFlooringOther" label="Other flooring preference" placeholder="Polished concrete, parquet, large-format tiles, microcement..." />}
          <TextareaBlock name="refurbFlooringNotes" label="Flooring additional information" placeholder="Existing floor condition, preferred finish, underfloor heating, herringbone, tile size..." />
        </div>
      )}
      {refurbTrades.includes("Plastering") && (
        <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-4">
          <ChoiceGrid title="Plastering and boarding" name="refurbPlasteringScope" options={["Plasterboard", "Moisture-resistant board", "Fire-rated plasterboard", "Skim coat plaster", "Repairs only", "Full reboard and skim", "Not sure"]} />
          <TextareaBlock name="refurbPlasteringNotes" label="Plastering additional information" placeholder="Ceilings only, full walls, patch repairs, old lath and plaster, fire upgrades..." />
        </div>
      )}
      {refurbTrades.includes("Decorating") && (
        <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-4">
          <ChoiceGrid title="Painting and decorating" name="refurbDecoratingScope" options={["Mist coat and paint", "Walls only", "Walls and ceilings", "Woodwork finish", "Wallpapering", "Feature walls", "Outside paint", "Not sure"]} />
          <SegmentedField name="refurbishmentExteriorFinish" label="Outside finish" options={["Rendering", "Outside paint", "Keep existing brick finish", "Not sure"]} value={refurbRendering} onChange={setRefurbRendering} defaultValue="Not sure" />
          <TextareaBlock name="refurbDecoratingNotes" label="Decorating additional information" placeholder="White only, colour by room, feature walls, external masonry paint, woodwork finish..." />
        </div>
      )}
      {refurbTrades.includes("Windows and doors") && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <SelectLike name="newWindowsCount" label="How many new windows?" options={roomCountOptions} />
            <SelectLike name="newWindowType" label="Window type" options={windowTypeOptions} />
          </div>
          <SegmentedField name="frontDoor" label="New front door?" options={["Yes", "No", "Not sure"]} value={frontDoor} onChange={setFrontDoor} defaultValue="No" />
          {frontDoor === "Yes" && <SelectLike name="frontDoorType" label="Front door type" options={doorTypeOptions} />}
          <SegmentedField name="backDoor" label="New back door?" options={["Yes", "No", "Not sure"]} value={backDoor} onChange={setBackDoor} defaultValue="No" />
          {backDoor === "Yes" && (
            <div className="grid gap-4 md:grid-cols-2">
              <SelectLike name="backDoorCount" label="How many back doors?" options={livingCountOptions} />
              <SelectLike name="backDoorType" label="Back door type" options={doorTypeOptions} />
            </div>
          )}
        </>
      )}
      {refurbTrades.includes("Chimney work") && (
        <>
          <SegmentedField name="chimneyRemoval" label="Chimney demolition?" options={["Yes", "No", "Not sure"]} value={chimneyRemoval} onChange={setChimneyRemoval} defaultValue="No" />
          {chimneyRemoval === "Yes" && (
            <div className="grid gap-4 md:grid-cols-2">
              <SelectLike name="chimneyCount" label="How many chimneys?" options={livingCountOptions} />
              <SelectLike name="chimneyFloors" label="How many floors?" options={["1", "2", "3", "4+", "Not sure"]} />
            </div>
          )}
        </>
      )}
      {refurbTrades.includes("Wall changes") && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <SelectLike name="wallRemovalCount" label="How many walls to remove?" options={livingCountOptions} value={wallRemovalCount} onChange={setWallRemovalCount} />
            <SelectLike name="newWallCount" label="How many new walls?" options={livingCountOptions} value={newWallCount} onChange={setNewWallCount} />
          </div>
          {wallDetailCount > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: wallDetailCount }, (_, index) => {
                const wallNumber = index + 1;

                return (
                  <div key={wallNumber} className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-4">
                    <SegmentedField
                      name={`wall${wallNumber}LoadBearing`}
                      label={`Wall ${wallNumber} load bearing?`}
                      options={["Yes", "No", "I don't know"]}
                      defaultValue="I don't know"
                    />
                    <Field
                      name={`wall${wallNumber}Size`}
                      label={`Wall ${wallNumber} size`}
                      placeholder="e.g. 3.2m x 2.4m"
                    />
                  </div>
                );
              })}
            </div>
          )}
          <TextareaBlock
            name="wallChangesNotes"
            label="Wall changes additional information"
            placeholder="Tell us if walls are coming out for open plan, splitting rooms, adding en-suites, forming cupboards, or if any wall sizes are only approximate."
          />
        </>
      )}
      {refurbTrades.includes("Doors and joinery") && (
        <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <SelectLike name="internalDoorsCount" label="How many internal doors?" options={roomCountOptions} />
            <SelectLike name="internalDoorType" label="Door type" options={doorTypeOptions} />
          </div>
          <ChoiceGrid title="Door items to include" name="doorItemsIncluded" options={["Frames", "Architraves", "Door stops", "Hinges", "Handles", "Locks", "Not sure"]} />
          <TextareaBlock name="refurbDoorNotes" label="Doors and joinery additional information" placeholder="Painted vs oak, fire-door requirements, soft-close hinges, black ironmongery, exact room locations..." />
        </div>
      )}
      {refurbTrades.includes("Bathroom") && (
        <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-4">
          <SelectLike name="refurbBathroomDetailCount" label="How many bathrooms are part of this trade?" options={bathroomCountOptions.slice(0, 6)} value={refurbBathroomDetailCount} onChange={setRefurbBathroomDetailCount} />
          {Array.from({ length: bathroomDetailCount }, (_, index) => {
            const bathroomNumber = index + 1;

            return (
              <div key={bathroomNumber} className="space-y-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                <h4 className="text-base font-black text-neutral-900">Bathroom {bathroomNumber}</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <SelectLike
                    name={`refurbBathroom${bathroomNumber}Type`}
                    label={`Bathroom ${bathroomNumber} type`}
                    options={["Toilet only", "Shower room", "Bathroom with bath", "Walk-in shower", "Both bath and shower", "Not sure"]}
                  />
                  <SelectLike
                    name={`refurbBathroom${bathroomNumber}Finish`}
                    label={`Bathroom ${bathroomNumber} tiling / finish`}
                    options={["Fully tiled", "Bath / shower area only", "Client to choose later", "Not sure"]}
                  />
                </div>
                <ChoiceGrid title={`Bathroom ${bathroomNumber} items`} name={`refurbBathroom${bathroomNumber}Items`} options={["Bath", "Shower", "Walk-in shower", "Toilet", "Basin", "Vanity unit", "Towel rail", "Extractor fan", "Not sure"]} />
                <TextareaBlock name={`refurbBathroom${bathroomNumber}Notes`} label={`Bathroom ${bathroomNumber} additional information`} placeholder="Full tile height, shower tray or wet room, concealed cistern, niches, brassware finish..." />
              </div>
            );
          })}
          <TextareaBlock name="refurbBathroomNotes" label="Overall bathroom notes" placeholder="Tell us if these are en-suites, family bathrooms, cloakrooms, or if one is much more detailed than the others." />
        </div>
      )}
      <FileDrop name="refurbishmentFiles" label="Upload current photos, snag lists or room plans" accept={uploadAccept} multiple />
      <TextareaBlock name="refurbishmentNotes" label="Refurbishment notes" placeholder="Damp repairs, match existing skirting, replace internal doors, rental standard upgrades, keep tenants in place..." />
      <SupplyNote area="refurbishment finish materials and decorative items" />
    </DetailPanel>
  );
}

function DemolitionQuestions() {
  return (
    <DetailPanel title="Demolition and strip-out" intro="Use this section when the main job is taking down, clearing out or preparing the site before the new build phase starts.">
      <Field name="demolitionAreaM2" label="Demolition area (m²)" placeholder="e.g. 22 or not sure" />
      <ChoiceGrid title="Demolition type" name="demolitionType" type="radio" required options={["Soft strip only", "Rear extension demolition", "Garage / outbuilding demolition", "Internal demolition", "Mixed demolition", "Not sure"]} />
      <ChoiceGrid title="What needs removing?" name="demolitionScope" options={["Kitchen", "Bathrooms", "Ceilings", "Floors", "Partitions", "Existing extension", "Shed / garage", "Fencing", "Driveway surface", "Not sure"]} />
      <SegmentedField name="demolitionWasteHandling" label="Waste and skip handling" options={["Contractor to include", "Client will arrange", "Not sure"]} defaultValue="Contractor to include" />
      <SegmentedField name="demolitionAsbestos" label="Any asbestos concerns?" options={["Yes", "No", "Not sure"]} defaultValue="Not sure" />
      <SegmentedField name="demolitionNeighbourSensitivity" label="Tight access / sensitive neighbours?" options={["Yes", "No", "Not sure"]} defaultValue="Not sure" />
      <FileDrop name="demolitionFiles" label="Upload demolition photos, surveys or PDFs" accept={uploadAccept} multiple />
      <TextareaBlock name="demolitionNotes" label="Demolition notes" placeholder="Shared passage, old roof sheets, noise restrictions, hand-demolition only, keep front wall, protect retained kitchen..." />
    </DetailPanel>
  );
}

function NewBuildQuestions() {
  const [newBuildType, setNewBuildType] = useState("House");
  const [newBuildRoofTypes, setNewBuildRoofTypes] = useState<string[]>([]);
  const [newBuildKitchen, setNewBuildKitchen] = useState("Yes");
  const [newBuildBathroom, setNewBuildBathroom] = useState("Yes");
  const [newBuildFlooring, setNewBuildFlooring] = useState<string[]>([]);

  return (
    <DetailPanel title="New build" intro="This follows a similar path to the extension brief, but covers more of the full house fit-out and the planning stage around it.">
      <SegmentedField name="newBuildType" label="New build type" options={["House", "Summer house / garden room", "Garage", "Annexe", "Small block / multiple units", "Not sure"]} value={newBuildType} onChange={setNewBuildType} defaultValue="House" required />
      {newBuildType === "House" && <SelectLike name="newBuildHouseType" label="What type of house?" options={["Detached", "Semi-detached", "Terraced", "Bungalow", "Townhouse", "Not sure"]} />}
      {newBuildType === "Summer house / garden room" && <SelectLike name="newBuildGardenRoomType" label="What type of summer house?" options={["Garden office", "Gym / studio", "Guest room", "Entertainment room", "Mixed use", "Not sure"]} />}
      {newBuildType === "Garage" && <SelectLike name="newBuildGarageType" label="What type of garage?" options={["Single garage", "Double garage", "Garage with storage", "Garage with room above", "Workshop garage", "Not sure"]} />}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SelectLike name="newBuildFloors" label="How many floors?" options={["1", "2", "3", "4+", "Not sure"]} />
        <SelectLike name="newBuildBedrooms" label="Bedrooms" options={roomCountOptions} />
        <SelectLike name="newBuildBathrooms" label="Bathrooms" options={bathroomCountOptions} />
        <Field name="newBuildAreaM2" label="Approximate floor area (m²)" placeholder="e.g. 145" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <SegmentedField name="newBuildPlanning" label="Planning permission" options={["Approved", "Applied", "Need help", "Not sure"]} defaultValue="Not sure" />
        <SegmentedField name="newBuildPlansReady" label="Do you already have plans?" options={["Yes", "No", "Partly", "Not sure"]} defaultValue="Not sure" />
      </div>
      <CheckboxCardGroup
        title="New build roof types"
        name="newBuildRoofType"
        options={roofTypeOptions}
        selected={newBuildRoofTypes}
        onToggle={(value) => setNewBuildRoofTypes((current) => toggleArrayValue(current, value))}
      />
      {newBuildRoofTypes.includes("Pitched roof") && <VisualCheckboxGrid title="Pitched roof covering" name="newBuildRoofTiles" options={roofTiles} />}
      {newBuildRoofTypes.includes("Flat roof") && <VisualChoiceGrid title="Flat roof membrane" name="newBuildFlatRoofSystem" options={flatRoofSystems} />}
      <ChoiceGrid title="Main spaces to include" name="newBuildSpaces" options={["Kitchen", "Utility", "Open-plan living", "Separate lounge", "Study", "En-suite", "Walk-in wardrobe", "Garage / storage", "Not sure"]} />
      <div className="grid gap-4 md:grid-cols-2">
        <SegmentedField name="newBuildKitchen" label="Kitchen included?" options={["Yes", "No", "Not sure"]} value={newBuildKitchen} onChange={setNewBuildKitchen} defaultValue="Yes" />
        <SegmentedField name="newBuildBathroom" label="Bathrooms included?" options={["Yes", "No", "Not sure"]} value={newBuildBathroom} onChange={setNewBuildBathroom} defaultValue="Yes" />
      </div>
      {newBuildKitchen === "Yes" && <SegmentedField name="newBuildKitchenType" label="Kitchen scope" options={["New kitchen", "Client to choose later", "Shell and first fix only", "Not sure"]} defaultValue="New kitchen" />}
      {newBuildBathroom === "Yes" && <ChoiceGrid title="Bathroom items" name="newBuildBathroomItems" options={["Bath", "Shower", "Walk-in shower", "Toilet", "Basin", "Vanity unit", "Extractor fan", "Not sure"]} />}
      <CheckboxCardGroup
        title="Flooring choice"
        name="newBuildFlooring"
        options={floorFinishOptions}
        selected={newBuildFlooring}
        onToggle={(value) => setNewBuildFlooring((current) => toggleArrayValue(current, value))}
      />
      {newBuildFlooring.includes("Other") && <TextareaBlock name="newBuildFlooringOther" label="Other flooring preference" placeholder="Microcement, engineered parquet, luxury vinyl, polished concrete..." />}
      <ChoiceGrid title="Electrical finish" name="newBuildElectrical" options={electricalFinishOptions} />
      <ChoiceGrid title="Plumbing works" name="newBuildPlumbing" options={["Radiators", "Underfloor heating", "Boiler work", "Hot and cold pipework", "Drainage", "Not sure"]} />
      <ChoiceGrid title="Refurbishment-style internal trades to include" name="newBuildInternalTrades" options={["Flooring", "Plastering", "Decorating", "Doors and joinery", "Windows and doors", "Not sure"]} />
      <ChoiceGrid title="Main finishes and trade items" name="newBuildFinishes" options={["Rooflights", "Bi-fold / sliding doors", "Underfloor heating", "Radiators", "Brick finish", "Wood flooring", "Tiling", "Decorating", "Outside paint", "Not sure"]} />
      <FileDrop name="newBuildFiles" label="Upload new build plans, inspiration or PDFs" accept={uploadAccept} multiple />
      <TextareaBlock name="newBuildNotes" label="New build notes" placeholder="Target layout, frontage look, parking, staircase position, annex use, rental use, preferred door and window style..." />
      <SupplyNote area="new-build kitchens, bathrooms, flooring and finish materials" />
    </DetailPanel>
  );
}

function FoundationQuestions() {
  return (
    <DetailPanel title="Foundations and groundwork" intro="Keep this practical. We ask about the groundworks trade items, access and concrete-related preparation rather than detailed engineering.">
      <ChoiceGrid title="Groundworks purpose" name="foundationPurpose" type="radio" required options={["Extension", "New build", "Garden room / outbuilding", "Retaining wall", "Underpinning / repair", "Not sure"]} />
      <ChoiceGrid title="Groundworks scope" name="foundationShellScope" options={["Excavation", "Concrete footings", "Drainage runs", "Retaining wall base", "Slab", "DPC level", "Not sure"]} />
      <SegmentedField name="foundationDrainage" label="Drainage nearby?" options={["Yes", "No", "Not sure"]} defaultValue="Not sure" />
      <SegmentedField name="foundationConcretePump" label="Concrete pump likely needed?" options={["Yes", "No", "Not sure"]} defaultValue="Not sure" />
      <FileDrop name="foundationFiles" label="Upload drawings, soil notes or site photos" accept={uploadAccept} multiple />
      <TextareaBlock name="foundationNotes" label="Ground conditions or access notes" placeholder="Clay, slope, shared access, low wall to remove, trees, manholes, restricted digger access..." />
    </DetailPanel>
  );
}

function GardenQuestions() {
  return (
    <DetailPanel title="Garden and driveway" intro="This section is for the finishes and trade items you actually want outside, not technical landscaping language.">
      <Field name="gardenAreaM2" label="Garden / driveway area (m²)" placeholder="e.g. 48 or not sure" />
      <ChoiceGrid title="Main work" name="gardenWork" type="radio" required options={["Driveway", "Patio", "Garden landscaping", "Fencing", "Drainage", "Mixed works"]} />
      <VisualChoiceGrid title="Preferred finish" name="gardenFinish" options={gardenFinishes} />
      <ChoiceGrid title="External works scope" name="externalWorksScope" options={["Patio / paving", "Decking", "Fencing", "Turf or artificial grass", "Planters / soft landscaping", "Drainage / soakaways", "Driveway", "Lighting"]} />
      <SegmentedField name="gardenSurfaceRemoval" label="Remove existing surface first?" options={["Yes", "No", "Not sure"]} defaultValue="Not sure" />
      <SegmentedField name="gardenDrainage" label="Need new drainage?" options={["Yes", "No", "Not sure"]} defaultValue="Not sure" />
      <FileDrop name="gardenFiles" label="Upload garden photos, sketches or PDFs" accept={uploadAccept} multiple />
      <TextareaBlock name="gardenNotes" label="Garden or driveway notes" placeholder="Parking spaces, levels, water pooling, side passage width, manholes, planting style, retaining edges..." />
      <SupplyNote area="outside finish materials, slabs, fencing and decorative landscape items" />
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
      <FileDrop name="sitePhotos" label="Upload photos or PDFs of the current space" accept={uploadAccept} multiple />
    </StepShell>
  );
}

function BudgetStep({
  budgetRange,
  setBudgetRange,
  quality,
  cheap,
  fast,
  tradeMood,
  updateTradeSlider,
}: {
  budgetRange: string;
  setBudgetRange: (value: string) => void;
  quality: number;
  cheap: number;
  fast: number;
  tradeMood: string;
  updateTradeSlider: (name: "quality" | "cheap" | "fast", value: number) => void;
}) {
  return (
    <StepShell eyebrow="Budget and priorities" title="Set expectations early." intro="A budget range lets us recommend the right specification instead of guessing.">
      <input type="hidden" name="extensionRatePerM2Example" value="2400" />
      <input type="hidden" name="loftRatePerM2Example" value="2100" />
      <input type="hidden" name="refurbishmentRatePerM2Example" value="950" />
      <input type="hidden" name="roofRatePerM2Example" value="180" />
      <input type="hidden" name="newBuildRatePerM2Example" value="2750" />
      <input type="hidden" name="gardenRatePerM2Example" value="160" />
      <input type="hidden" name="demolitionRatePerM2Example" value="85" />
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-black text-neutral-800">
            Budget range
            <span className="ml-1 text-amber-700">*</span>
          </span>
          <select
            name="budgetRange"
            required
            value={budgetRange}
            onChange={(event) => setBudgetRange(event.target.value)}
            className="h-12 w-full rounded-2xl border border-neutral-300 bg-neutral-50 px-3 text-sm shadow-sm outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="" disabled>Select your range</option>
            {budgetRangeOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-black text-neutral-800">
            Budget privacy
          </span>
          <select
            name="budgetPreference"
            defaultValue="Happy to share range"
            className="h-12 w-full rounded-2xl border border-neutral-300 bg-neutral-50 px-3 text-sm shadow-sm outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="Happy to share range">Happy to share range</option>
            <option value="Prefer not to say">Prefer not to say</option>
            <option value="Need guidance">Need guidance</option>
          </select>
        </label>
        <SelectLike name="budgetPressure" label="What matters most about budget?" options={["Keep total cost under control", "Balance cost and finish", "Higher finish is more important", "Need advice"]} required />
      </div>
      <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-amber-700">Saved for pricing logic</p>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          Alongside the client answers, this form also saves bedroom counts, area fields and example `rate per m²` variables for each trade section. You can replace the example values in code when you build the formula.
        </p>
      </div>
      <div className="rounded-[2rem] border border-neutral-200 bg-neutral-950 p-5 text-white">
        <input type="hidden" name="qualityPriority" value={quality} />
        <input type="hidden" name="cheapPriority" value={cheap} />
        <input type="hidden" name="fastPriority" value={fast} />
        <div className="flex items-start gap-3">
          <Sparkles className="mt-1 h-5 w-5 text-amber-300" />
          <div>
            <h3 className="text-xl font-black">The builder triangle</h3>
            <p className="mt-1 text-sm text-white/70">Quality, cheap and fast always share the same fixed pot. Push one up and the other two have to give some ground.</p>
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

function SelectLike({
  name,
  label,
  options,
  icon,
  required = false,
  placeholder,
  value,
  onChange,
}: {
  name: string;
  label: string;
  options: string[];
  icon?: React.ReactNode;
  required?: boolean;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-sm font-black text-neutral-800">
        {icon && <span className="[&_svg]:h-4 [&_svg]:w-4 [&_svg]:text-amber-600">{icon}</span>}
        {label}
        {required && <span className="text-amber-700">*</span>}
      </span>
      <select
        name={name}
        required={required}
        value={value}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        defaultValue={value === undefined ? (placeholder ? "" : options[0]) : undefined}
        className="h-12 w-full rounded-2xl border border-neutral-300 bg-neutral-50 px-3 text-sm shadow-sm outline-none focus:ring-2 focus:ring-amber-400"
      >
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

function SegmentedField({
  name,
  label,
  options,
  value,
  onChange,
  required = false,
  defaultValue,
}: {
  name: string;
  label: string;
  options: string[];
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  defaultValue?: string;
}) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? options[0] ?? "");
  const selectedValue = value ?? internalValue;

  return (
    <div>
      <p className="mb-2 text-sm font-black text-neutral-800">
        {label}
        {required && <span className="ml-1 text-amber-700">*</span>}
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {options.map((option, index) => (
          <label
            key={option}
            className={cn(
              "cursor-pointer rounded-2xl border px-3 py-2 text-center text-sm font-bold transition",
              selectedValue === option ? "border-amber-500 bg-amber-100 text-neutral-950 shadow-sm" : "border-neutral-200 bg-neutral-50 text-neutral-600 hover:border-amber-400"
            )}
          >
            <input
              type="radio"
              name={name}
              value={option}
              checked={selectedValue === option}
              onChange={() => {
                setInternalValue(option);
                onChange?.(option);
              }}
              required={required && index === 0}
              className="sr-only"
            />
            {option}
          </label>
        ))}
      </div>
    </div>
  );
}

function CheckboxCardGroup({
  title,
  name,
  options,
  selected,
  onToggle,
}: {
  title: string;
  name: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div>
      <h3 className="mb-3 text-lg font-black">{title}</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label
            key={option}
            className={cn(
              "cursor-pointer rounded-2xl border p-3 text-sm font-bold transition",
              selected.includes(option) ? "border-amber-500 bg-amber-100 shadow-sm" : "border-neutral-200 bg-neutral-50 hover:border-amber-400"
            )}
          >
            <input
              type="checkbox"
              name={name}
              value={option}
              checked={selected.includes(option)}
              onChange={() => onToggle(option)}
              className="sr-only"
            />
            {option}
          </label>
        ))}
      </div>
    </div>
  );
}

function VisualCheckboxGrid({
  title,
  name,
  options,
}: {
  title: string;
  name: string;
  options: { title: string; image: string; detail: string }[];
}) {
  return (
    <div>
      <h3 className="mb-3 text-lg font-black">{title}</h3>
      <div className="grid gap-3 md:grid-cols-2">
        {options.map((option) => (
          <label key={option.title} className="overflow-hidden rounded-2xl border border-neutral-200 transition hover:border-amber-400 has-[:checked]:border-amber-500 has-[:checked]:bg-amber-50 has-[:checked]:shadow-lg">
            <div className="relative h-32">
              <Image src={option.image} alt={option.title} fill className="object-cover" />
            </div>
            <span className="flex gap-3 p-3">
              <input type="checkbox" name={name} value={option.title} className="mt-1" />
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
        url: file.type.startsWith("image/") || file.type.startsWith("video/") ? URL.createObjectURL(file) : undefined,
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
          Images, videos, PDFs, Word, Excel and text files supported
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
  const isVideo = !!file.url && (file.type?.startsWith("video/") || /\.(mp4|mov|webm|avi|m4v)($|\?)/i.test(file.url));
  const isPdf = file.type === "application/pdf" || /\.pdf($|\?)/i.test(file.url ?? file.name);
  const cardBody = (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition hover:shadow-md">
      {isImage && file.url ? (
        <div className="relative h-36 bg-neutral-100">
          <Image src={file.url} alt={file.name} fill className="object-cover" unoptimized />
        </div>
      ) : isVideo && file.url ? (
        <div className="h-36 bg-neutral-950">
          <video src={file.url} className="h-full w-full object-cover" controls preload="metadata" />
        </div>
      ) : (
        <div className="flex h-36 flex-col items-center justify-center gap-3 bg-gradient-to-br from-neutral-100 to-neutral-50 px-4 text-center">
          <div className="rounded-full bg-white p-3 shadow-sm">
            <FileText className="h-7 w-7 text-amber-700" />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
            {isPdf ? "PDF document" : isVideo ? "Video file" : "File attached"}
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
              {isPdf ? "Open PDF" : isVideo ? "Open video" : "Open file"}
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
      </span>
      <input type="range" min="0" max="100" value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-3 w-full accent-amber-400" />
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

function buildBudgetRangeOptions() {
  const ranges: string[] = [];

  for (let start = 1; start < 80; start += 5) {
    ranges.push(formatBudgetRange(start, start + 5));
  }

  for (let start = 80; start < 250; start += 10) {
    ranges.push(formatBudgetRange(start, start + 10));
  }

  for (let start = 250; start < 500; start += 50) {
    ranges.push(formatBudgetRange(start, start + 50));
  }

  for (let start = 500; start < 980; start += 80) {
    ranges.push(formatBudgetRange(start, Math.min(1000, start + 80)));
  }

  ranges.push("£980k - £1m+");

  return ranges;
}

function formatBudgetRange(fromK: number, toK: number) {
  return `£${fromK}k - £${toK}k`;
}

function toggleArrayValue(current: string[], value: string) {
  return current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
}
