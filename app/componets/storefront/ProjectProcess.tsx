"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type Transition,
  type Variants,
} from "framer-motion";

import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Hammer,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

/* ================================================================
   TYPES
================================================================ */

type ProcessStep = {
  title: string;
  shortTitle: string;
  text: string;
  details: string;
  img: string;
  icon: React.ReactNode;
};

type Counter = {
  label: string;
  value: number;
  suffix?: string;
};

/* ================================================================
   BRAND
================================================================ */

const BRAND = "#f5b400";
const DARK = "#111111";
const DARK_SOFT = "#171717";

/* ================================================================
   PROCESS DATA
================================================================ */

const PROCESS_STEPS: ProcessStep[] = [
  {
    title: "Site Visit",
    shortTitle: "Visit",
    text: "Measure, inspect and capture your brief.",
    details:
      "We visit the property, take accurate measurements, assess the existing structure and understand exactly what you want to achieve.",
    img: "/images/site_insp.jpg",
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  {
    title: "Fixed Quote",
    shortTitle: "Quote",
    text: "Scope, inclusions and schedule — no surprises.",
    details:
      "You receive a clearly defined scope with inclusions, exclusions and an agreed schedule so the project starts with everyone aligned.",
    img: "/images/quote.jpg",
    icon: <ShieldCheck className="h-4 w-4" />,
  },
  {
    title: "Build & Protect",
    shortTitle: "Build",
    text: "Daily protection, tidy site and clear updates.",
    details:
      "We coordinate the build, protect floors and finishes, maintain a tidy working environment and keep you informed throughout.",
    img: "/images/build.jpg",
    icon: <Hammer className="h-4 w-4" />,
  },
  {
    title: "Clean Handover",
    shortTitle: "Handover",
    text: "Deep clean, snag-free finish and warranties.",
    details:
      "Before handover, we complete the final clean, address outstanding snags and provide the relevant completion information and warranties.",
    img: "/images/handover.jpg",
    icon: <Clock3 className="h-4 w-4" />,
  },
];

const DEFAULT_COUNTERS: Counter[] = [
  {
    label: "Projects Delivered",
    value: 120,
    suffix: "+",
  },
  {
    label: "Avg. Rating",
    value: 5,
  },
  {
    label: "Years Experience",
    value: 10,
    suffix: "+",
  },
  {
    label: "Snag-Free Handovers",
    value: 98,
    suffix: "%",
  },
];

const EASE: Transition["ease"] = [0.22, 1, 0.36, 1];

/* ================================================================
   ANIMATION VARIANTS
================================================================ */

const headingVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 30,
  },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: EASE,
    },
  },
};

const cardVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 25,
  },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      ease: EASE,
    },
  },
};

/* ================================================================
   PROJECT BUTTON
================================================================ */

function ProjectButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="
        group
        relative
        inline-flex
        items-center
        gap-4
        overflow-hidden
        border
        border-[#f5b400]
        bg-[#f5b400]
        px-6
        py-3.5
        text-[10px]
        font-bold
        uppercase
        tracking-[0.16em]
        text-black
        transition-all
        duration-300
        hover:border-white
        hover:text-white
      "
    >
      <span
        aria-hidden="true"
        className="
          absolute
          inset-0
          z-0
          origin-left
          scale-x-0
          bg-black
          transition-transform
          duration-500
          ease-out
          group-hover:scale-x-100
        "
      />

      <span className="relative z-10 flex items-center gap-4">
        <span>{children}</span>

        <ArrowRight
          className="
            h-4
            w-4
            transition-all
            duration-300
            group-hover:translate-x-1
          "
        />
      </span>
    </Link>
  );
}

/* ================================================================
   BACKGROUND
================================================================ */

function ProcessBackground() {
  return (
    <div
      aria-hidden="true"
      className="
        pointer-events-none
        absolute
        inset-0
        z-0
        overflow-hidden
        bg-[#111111]
      "
    >
      {/* Architectural grid */}
      <div
        className="
          absolute
          inset-0
          opacity-[0.045]
          [background-image:linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)]
          [background-size:80px_80px]
        "
      />

      {/* Fine secondary grid */}
      <div
        className="
          absolute
          inset-0
          opacity-[0.018]
          [background-image:linear-gradient(to_right,#f5b400_1px,transparent_1px),linear-gradient(to_bottom,#f5b400_1px,transparent_1px)]
          [background-size:20px_20px]
        "
      />

      {/* Large architectural curves */}
      <svg
        className="
          absolute
          right-[-12%]
          top-[5%]
          h-[700px]
          w-[78%]
          opacity-[0.13]
        "
        viewBox="0 0 800 600"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M0 580C150 300 330 90 800 30"
          stroke={BRAND}
          strokeWidth="1"
        />

        <path
          d="M70 600C220 350 400 150 800 100"
          stroke={BRAND}
          strokeWidth="1"
          opacity="0.65"
        />

        <path
          d="M190 600C330 420 500 240 800 180"
          stroke={BRAND}
          strokeWidth="1"
          opacity="0.4"
        />

        <path
          d="M330 600C455 470 590 340 800 270"
          stroke={BRAND}
          strokeWidth="1"
          opacity="0.22"
        />

        <path
          d="M480 600C570 500 670 410 800 360"
          stroke={BRAND}
          strokeWidth="1"
          opacity="0.12"
        />
      </svg>

      {/* Yellow atmospheric glow */}
      <div
        className="
          absolute
          -right-56
          top-[8%]
          h-[560px]
          w-[560px]
          rounded-full
          bg-[#f5b400]
          opacity-[0.09]
          blur-[150px]
        "
      />

      {/* Bottom glow */}
      <div
        className="
          absolute
          -left-60
          bottom-[-220px]
          h-[500px]
          w-[500px]
          rounded-full
          bg-[#f5b400]
          opacity-[0.045]
          blur-[150px]
        "
      />

      {/* Subtle vignette */}
      <div
        className="
          absolute
          inset-0
          bg-[radial-gradient(circle_at_70%_20%,transparent_0%,rgba(0,0,0,0.25)_65%,rgba(0,0,0,0.45)_100%)]
        "
      />
    </div>
  );
}

/* ================================================================
   MAIN COMPONENT
================================================================ */

export function ProjectProcess({
  steps = PROCESS_STEPS,
  counters = DEFAULT_COUNTERS,
  beforeAfter = {
    before: "/images/refurb.jpg",
    after: "/images/ext.jpeg",
  },
}: {
  steps?: ProcessStep[];
  counters?: Counter[];
  beforeAfter?: {
    before: string;
    after: string;
  };
}) {
  const reducedMotion = Boolean(useReducedMotion());

  const wrapRef = useRef<HTMLDivElement | null>(null);

  const { scrollYProgress } = useScroll({
    target: wrapRef,
    offset: ["start 75%", "end 35%"],
  });

  const lineProgress = useTransform(
    scrollYProgress,
    [0, 1],
    ["0%", "100%"],
  );

  const [activeStep, setActiveStep] = useState(0);
  const [mix, setMix] = useState(50);

  const active = steps[activeStep];

  return (
    <section
      ref={wrapRef}
      className="
        relative
        isolate
        overflow-hidden
        bg-[#111111]
        py-20
        text-white
        md:py-28
      "
    >
      <ProcessBackground />

      <div
        className="
          relative
          z-10
          mx-auto
          max-w-7xl
          px-5
          sm:px-6
          lg:px-8
        "
      >
        {/* ========================================================
            HEADER
        ======================================================== */}

        <motion.div
          variants={headingVariants}
          initial="hidden"
          whileInView="show"
          viewport={{
            once: true,
            amount: 0.2,
          }}
          className="max-w-3xl"
        >
          <div className="flex items-center gap-3">
            <span className="h-px w-10 bg-[#f5b400]" />

            <span
              className="
                text-[10px]
                font-bold
                uppercase
                tracking-[0.32em]
                text-[#f5b400]
              "
            >
              How your project flows
            </span>
          </div>

          <h2
            className="
              mt-6
              text-4xl
              font-semibold
              leading-[0.92]
              tracking-[-0.05em]
              sm:text-5xl
              md:text-6xl
              lg:text-[5.2rem]
            "
          >
            From first visit
            <br />
            to clean
            <br />
            <span className="text-white/30">handover.</span>
          </h2>

          <p
            className="
              mt-7
              max-w-2xl
              text-sm
              leading-6
              text-white/60
              md:text-base
              md:leading-7
            "
          >
            A clear, structured process designed to keep your
            project organised from the first conversation through
            to completion.
          </p>
        </motion.div>

        {/* ========================================================
            PROCESS
        ======================================================== */}

        <div className="mt-16 md:mt-20">
          {/* DESKTOP */}

          <div className="relative hidden md:block">
            {/* Background line */}

            <div
              className="
                absolute
                left-[12.5%]
                right-[12.5%]
                top-[22px]
                h-px
                bg-white/15
              "
            />

            {/* Active line */}

            <motion.div
              style={{
                width: lineProgress,
              }}
              className="
                absolute
                left-[12.5%]
                top-[22px]
                h-[2px]
                bg-[#f5b400]
                shadow-[0_0_14px_rgba(245,180,0,0.35)]
              "
            />

            <div className="grid grid-cols-4 gap-8">
              {steps.map((step, index) => {
                const selected = activeStep === index;

                return (
                  <ProcessDesktopCard
                    key={`${step.title}-${index}`}
                    step={step}
                    index={index}
                    selected={selected}
                    onSelect={() => setActiveStep(index)}
                  />
                );
              })}
            </div>
          </div>

          {/* MOBILE */}

          <div className="relative md:hidden">
            {/* Background line */}

            <div
              className="
                absolute
                bottom-10
                left-[19px]
                top-0
                w-px
                bg-white/15
              "
            />

            {/* Active line */}

            <motion.div
              style={{
                height: lineProgress,
              }}
              className="
                absolute
                left-[19px]
                top-0
                w-[2px]
                bg-[#f5b400]
                shadow-[0_0_12px_rgba(245,180,0,0.35)]
              "
            />

            <div className="space-y-6">
              {steps.map((step, index) => {
                const selected = activeStep === index;

                return (
                  <ProcessMobileCard
                    key={`${step.title}-${index}`}
                    step={step}
                    index={index}
                    selected={selected}
                    onSelect={() => setActiveStep(index)}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* ========================================================
            FEATURED PROCESS
        ======================================================== */}

        <div
          className="
            mt-20
            border-t
            border-white/15
            pt-10
            md:mt-28
            md:pt-14
          "
        >
          <div
            className="
              grid
              gap-10
              lg:grid-cols-[1.15fr_0.85fr]
              lg:gap-14
            "
          >
            {/* ====================================================
                BEFORE / AFTER
            ==================================================== */}

            <motion.div
              initial={{
                opacity: 0,
                x: reducedMotion ? 0 : -30,
              }}
              whileInView={{
                opacity: 1,
                x: 0,
              }}
              viewport={{
                once: true,
                amount: 0.15,
              }}
              transition={{
                duration: 0.7,
                ease: EASE,
              }}
              className="
                relative
                overflow-hidden
                bg-black
              "
            >
              {/* Offset architectural frame */}

              <div
                aria-hidden="true"
                className="
                  pointer-events-none
                  absolute
                  -left-3
                  -top-3
                  z-40
                  h-full
                  w-full
                  border
                  border-[#f5b400]/35
                "
              />

              <div className="relative aspect-[16/10] w-full">
                {/* AFTER */}

                <Image
                  src={beforeAfter.after}
                  alt="Completed construction project"
                  fill
                  priority={false}
                  className="object-cover"
                  sizes="(min-width: 1024px) 60vw, 100vw"
                />

                {/* BEFORE */}

                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{
                    clipPath: `inset(0 ${100 - mix}% 0 0)`,
                  }}
                >
                  <Image
                    src={beforeAfter.before}
                    alt="Project before construction"
                    fill
                    className="object-cover"
                    sizes="(min-width: 1024px) 60vw, 100vw"
                  />
                </div>

                {/* Dark gradient */}

                <div
                  className="
                    absolute
                    inset-x-0
                    bottom-0
                    h-36
                    bg-gradient-to-t
                    from-[#111111]
                    via-[#111111]/40
                    to-transparent
                  "
                />

                {/* Yellow divider */}

                <div
                  className="
                    absolute
                    bottom-0
                    top-0
                    z-20
                    w-[2px]
                    bg-[#f5b400]
                    shadow-[0_0_14px_rgba(245,180,0,0.5)]
                  "
                  style={{
                    left: `${mix}%`,
                  }}
                />

                {/* Slider handle */}

                <div
                  className="
                    pointer-events-none
                    absolute
                    top-1/2
                    z-30
                    flex
                    h-10
                    w-10
                    -translate-x-1/2
                    -translate-y-1/2
                    items-center
                    justify-center
                    rounded-full
                    border
                    border-[#f5b400]
                    bg-[#111111]
                    shadow-[0_0_20px_rgba(0,0,0,0.4)]
                  "
                  style={{
                    left: `${mix}%`,
                  }}
                >
                  <ArrowRight
                    className="
                      h-4
                      w-4
                      text-[#f5b400]
                    "
                  />
                </div>

                {/* BEFORE label */}

                <div
                  className="
                    absolute
                    bottom-5
                    left-5
                    z-30
                    border
                    border-white/20
                    bg-[#111111]/90
                    px-3
                    py-1.5
                    text-[9px]
                    font-bold
                    uppercase
                    tracking-[0.18em]
                    text-white
                    backdrop-blur-sm
                  "
                >
                  Before
                </div>

                {/* AFTER label */}

                <div
                  className="
                    absolute
                    bottom-5
                    right-5
                    z-30
                    bg-[#f5b400]
                    px-3
                    py-1.5
                    text-[9px]
                    font-bold
                    uppercase
                    tracking-[0.18em]
                    text-black
                  "
                >
                  After
                </div>

                {/* Slider input */}

                <input
                  type="range"
                  min={0}
                  max={100}
                  value={mix}
                  onChange={(event) =>
                    setMix(Number(event.target.value))
                  }
                  aria-label="Before and after project comparison"
                  className="
                    absolute
                    bottom-0
                    left-0
                    z-40
                    h-full
                    w-full
                    cursor-ew-resize
                    opacity-0
                  "
                />
              </div>
            </motion.div>

            {/* ====================================================
                ACTIVE STEP
            ==================================================== */}

            <motion.div
              key={active.title}
              initial={{
                opacity: 0,
                y: reducedMotion ? 0 : 15,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.45,
                ease: EASE,
              }}
              className="
                flex
                flex-col
                justify-center
              "
            >
              <div className="flex items-center gap-3">
                <span className="h-px w-7 bg-[#f5b400]" />

                <span
                  className="
                    text-[9px]
                    font-bold
                    uppercase
                    tracking-[0.28em]
                    text-[#f5b400]
                  "
                >
                  Stage {String(activeStep + 1).padStart(2, "0")} /{" "}
                  {String(steps.length).padStart(2, "0")}
                </span>
              </div>

              {/* Icon */}

              <div
                className="
                  mt-6
                  flex
                  h-12
                  w-12
                  items-center
                  justify-center
                  border
                  border-[#f5b400]/50
                  bg-[#f5b400]/10
                  text-[#f5b400]
                "
              >
                {active.icon}
              </div>

              <h3
                className="
                  mt-6
                  text-3xl
                  font-semibold
                  tracking-[-0.04em]
                  text-white
                  md:text-4xl
                "
              >
                {active.title}
              </h3>

              <p
                className="
                  mt-4
                  max-w-lg
                  text-sm
                  leading-6
                  text-white/60
                  md:text-base
                  md:leading-7
                "
              >
                {active.details}
              </p>

              {/* Small process indicator */}

              <div className="mt-7 flex gap-2">
                {steps.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setActiveStep(index)}
                    aria-label={`View stage ${index + 1}`}
                    className={`
                      h-1
                      transition-all
                      duration-300
                      ${
                        activeStep === index
                          ? "w-10 bg-[#f5b400]"
                          : "w-4 bg-white/20 hover:bg-white/40"
                      }
                    `}
                  />
                ))}
              </div>

              <div className="mt-8">
                <ProjectButton href="/contact">
                  Start your project
                </ProjectButton>
              </div>
            </motion.div>
          </div>
        </div>

        {/* ========================================================
            STATS
        ======================================================== */}

        <div
          className="
            mt-16
            grid
            grid-cols-2
            border-t
            border-white/15
            md:mt-20
            md:grid-cols-4
          "
        >
          {counters.map((counter, index) => (
            <StatBlock
              key={counter.label}
              value={counter.value}
              label={counter.label}
              suffix={counter.suffix}
              bordered={index !== 0}
            />
          ))}
        </div>

        {/* ========================================================
            BOTTOM RIBBON
        ======================================================== */}

        <div
          className="
            mt-12
            flex
            flex-col
            gap-5
            border-t
            border-white/15
            pt-7
            md:flex-row
            md:items-center
            md:justify-between
          "
        >
          <div className="flex items-center gap-3">
            <Sparkles
              className="
                h-4
                w-4
                text-[#f5b400]
              "
              strokeWidth={1.5}
            />

            <p
              className="
                text-[9px]
                font-bold
                uppercase
                tracking-[0.25em]
                text-white/45
              "
            >
              Construction · Renovation · Transformation
            </p>
          </div>

          <p
            className="
              max-w-md
              text-xs
              leading-5
              text-white/40
              md:text-right
            "
          >
            Clear communication, controlled delivery and a
            properly finished home from start to handover.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   DESKTOP PROCESS CARD
================================================================ */

function ProcessDesktopCard({
  step,
  index,
  selected,
  onSelect,
}: {
  step: ProcessStep;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      variants={cardVariants}
      initial="hidden"
      whileInView="show"
      viewport={{
        once: true,
        amount: 0.2,
      }}
      className="
        group
        relative
        text-left
        outline-none
      "
    >
      {/* NODE */}

      <div
        className="
          relative
          z-20
          mx-auto
          flex
          h-11
          w-11
          items-center
          justify-center
          border
          transition-all
          duration-300
        "
        style={{
          borderColor: selected
            ? BRAND
            : "rgba(255,255,255,0.2)",
          background: selected
            ? BRAND
            : "rgba(255,255,255,0.04)",
          boxShadow: selected
            ? "0 0 20px rgba(245,180,0,0.22)"
            : "none",
        }}
      >
        <span
          className="
            text-[10px]
            font-bold
            tracking-[0.15em]
          "
          style={{
            color: selected ? DARK : "#ffffff",
          }}
        >
          0{index + 1}
        </span>
      </div>

      {/* CARD */}

      <div
        className={`
          mt-7
          overflow-hidden
          border
          transition-all
          duration-500
          ${
            selected
              ? "border-[#f5b400]/55 bg-[#f5b400]/[0.07] shadow-[0_15px_45px_rgba(0,0,0,0.2)]"
              : "border-white/10 bg-white/[0.025] group-hover:-translate-y-1 group-hover:border-[#f5b400]/35 group-hover:bg-white/[0.045]"
          }
        `}
      >
        {/* IMAGE */}

        <div className="relative h-36 overflow-hidden">
          <Image
            src={step.img}
            alt={step.title}
            fill
            className="
              object-cover
              transition-transform
              duration-700
              group-hover:scale-[1.06]
            "
            sizes="25vw"
          />

          <div className="absolute inset-0 bg-[#111111]/35" />

          <div
            className="
              absolute
              bottom-0
              left-0
              right-0
              h-20
              bg-gradient-to-t
              from-[#111111]
              to-transparent
            "
          />

          {/* Image number */}

          <span
            className="
              absolute
              right-3
              top-3
              border
              border-white/20
              bg-[#111111]/70
              px-2
              py-1
              text-[8px]
              font-bold
              tracking-[0.15em]
              text-white/70
              backdrop-blur-sm
            "
          >
            0{index + 1}
          </span>
        </div>

        {/* CONTENT */}

        <div className="p-5">
          <div className="flex items-center gap-2">
            <span
              className={`
                h-px
                transition-all
                duration-300
                ${
                  selected
                    ? "w-8 bg-[#f5b400]"
                    : "w-5 bg-white/50 group-hover:w-8 group-hover:bg-[#f5b400]"
                }
              `}
            />

            <span
              className="
                text-[8px]
                font-bold
                uppercase
                tracking-[0.24em]
                text-white/40
              "
            >
              {step.shortTitle}
            </span>
          </div>

          <h3
            className="
              mt-3
              text-lg
              font-semibold
              tracking-[-0.025em]
              text-white
            "
          >
            {step.title}
          </h3>

          <p
            className="
              mt-2
              text-xs
              leading-5
              text-white/50
            "
          >
            {step.text}
          </p>
        </div>

        {/* ACCENT LINE */}

        <div
          className={`
            h-[2px]
            origin-left
            bg-[#f5b400]
            transition-transform
            duration-500
            ${
              selected
                ? "scale-x-100"
                : "scale-x-0 group-hover:scale-x-100"
            }
          `}
        />
      </div>
    </motion.button>
  );
}

/* ================================================================
   MOBILE PROCESS CARD
================================================================ */

function ProcessMobileCard({
  step,
  index,
  selected,
  onSelect,
}: {
  step: ProcessStep;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      variants={cardVariants}
      initial="hidden"
      whileInView="show"
      viewport={{
        once: true,
        amount: 0.15,
      }}
      className="
        group
        relative
        grid
        w-full
        grid-cols-[40px_1fr]
        gap-4
        text-left
        outline-none
      "
    >
      {/* NODE */}

      <div
        className="
          relative
          z-20
          flex
          h-10
          w-10
          items-center
          justify-center
          border
          transition-all
          duration-300
        "
        style={{
          borderColor: selected
            ? BRAND
            : "rgba(255,255,255,0.2)",
          background: selected
            ? BRAND
            : "rgba(255,255,255,0.04)",
          boxShadow: selected
            ? "0 0 16px rgba(245,180,0,0.2)"
            : "none",
        }}
      >
        <span
          className="
            text-[9px]
            font-bold
            tracking-[0.15em]
          "
          style={{
            color: selected ? DARK : "#ffffff",
          }}
        >
          0{index + 1}
        </span>
      </div>

      {/* CONTENT */}

      <div
        className={`
          overflow-hidden
          border
          transition-all
          duration-300
          ${
            selected
              ? "border-[#f5b400]/45 bg-[#f5b400]/[0.06]"
              : "border-white/10 bg-white/[0.025]"
          }
        `}
      >
        {/* IMAGE */}

        <div className="relative h-32">
          <Image
            src={step.img}
            alt={step.title}
            fill
            className="
              object-cover
              transition-transform
              duration-700
              group-hover:scale-[1.04]
            "
            sizes="calc(100vw - 85px)"
          />

          <div className="absolute inset-0 bg-[#111111]/35" />

          <div
            className="
              absolute
              bottom-0
              left-0
              right-0
              h-20
              bg-gradient-to-t
              from-[#111111]
              to-transparent
            "
          />

          <span
            className="
              absolute
              right-3
              top-3
              bg-[#111111]/75
              px-2
              py-1
              text-[8px]
              font-bold
              tracking-[0.15em]
              text-white/70
              backdrop-blur-sm
            "
          >
            0{index + 1}
          </span>
        </div>

        {/* TEXT */}

        <div className="p-4">
          <div className="flex items-center gap-2">
            <span
              className={`
                h-px
                transition-all
                duration-300
                ${
                  selected
                    ? "w-7 bg-[#f5b400]"
                    : "w-5 bg-white/50"
                }
              `}
            />

            <span
              className="
                text-[8px]
                font-bold
                uppercase
                tracking-[0.22em]
                text-white/40
              "
            >
              {step.shortTitle}
            </span>
          </div>

          <h3
            className="
              mt-2
              text-base
              font-semibold
              tracking-[-0.015em]
              text-white
            "
          >
            {step.title}
          </h3>

          <p
            className="
              mt-1
              text-[10px]
              leading-4
              text-white/50
            "
          >
            {step.text}
          </p>
        </div>

        {/* ACCENT */}

        <div
          className={`
            h-[2px]
            origin-left
            bg-[#f5b400]
            transition-transform
            duration-500
            ${
              selected
                ? "scale-x-100"
                : "scale-x-0"
            }
          `}
        />
      </div>
    </motion.button>
  );
}

/* ================================================================
   STAT BLOCK
================================================================ */

function StatBlock({
  value,
  label,
  suffix,
  bordered,
}: {
  value: number;
  label: string;
  suffix?: string;
  bordered: boolean;
}) {
  return (
    <motion.div
      whileHover={{
        y: -2,
      }}
      className={`
        px-4
        py-7
        text-center
        md:px-6
        ${
          bordered
            ? "border-l border-white/15"
            : ""
        }
      `}
    >
      <div
        className="
          text-3xl
          font-semibold
          tracking-[-0.04em]
          text-[#f5b400]
          md:text-4xl
        "
      >
        <AnimatedCount to={value} />
        {suffix ?? ""}
      </div>

      <div
        className="
          mt-2
          text-[8px]
          font-bold
          uppercase
          tracking-[0.22em]
          text-white/40
        "
      >
        {label}
      </div>
    </motion.div>
  );
}

/* ================================================================
   ANIMATED COUNTER
================================================================ */

function AnimatedCount({
  to,
}: {
  to: number;
}) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let raf = 0;

    const start = performance.now();

    const tick = (time: number) => {
      const progress = Math.min(
        1,
        (time - start) / 900,
      );

      const eased =
        1 - Math.pow(1 - progress, 3);

      setValue(
        Math.round(eased * to),
      );

      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
    };
  }, [to]);

  return <span>{value}</span>;
}