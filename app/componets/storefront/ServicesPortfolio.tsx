"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import {
  ArrowRight,
  Building2,
  House,
  Layers3,
  Plus,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
  type Variants,
} from "framer-motion";

type Service = {
  slug: string;
  number: string;
  title: string;
  shortTitle: string;
  href: string;
  image: string;
  description: string;
  Icon: LucideIcon;
};

const NAVY = "#071a33";

const SERVICES: Service[] = [
  {
    slug: "extention",
    number: "01",
    title: "House Extensions",
    shortTitle: "Extensions",
    href: "/portfolio/extention",
    image: "/images/ext.jpeg",
    description:
      "Open-plan kitchens, single and double-storey extensions, structural alterations and carefully integrated new living spaces.",
    Icon: House,
  },
  {
    slug: "loft",
    number: "02",
    title: "Loft Conversions",
    shortTitle: "Lofts",
    href: "/portfolio/loft",
    image: "/images/loft.jpg",
    description:
      "Dormer, hip-to-gable, mansard and Velux conversions designed to turn unused roof space into practical rooms.",
    Icon: Building2,
  },
  {
    slug: "refurbishment",
    number: "03",
    title: "Refurbishments",
    shortTitle: "Refurbishments",
    href: "/portfolio/refurbishment",
    image: "/images/refurb.jpg",
    description:
      "Complete property transformations including reconfiguration, kitchens, bathrooms, finishes and full-home upgrades.",
    Icon: Sparkles,
  },
  {
    slug: "roof",
    number: "04",
    title: "Roofing",
    shortTitle: "Roofing",
    href: "/portfolio/roof",
    image: "/images/roof_edmonton.jpg",
    description:
      "Slate, tile, GRP and EPDM flat roofing, leadwork, gutters and replacement roofing built for long-term performance.",
    Icon: House,
  },
  {
    slug: "general",
    number: "05",
    title: "General Projects",
    shortTitle: "General",
    href: "/portfolio/general",
    image: "/images/refurb.jpg",
    description:
      "Kitchens, bathrooms, structural work, reconfiguration and finishing work tailored to the property and project.",
    Icon: Layers3,
  },
];

const EASE: Transition["ease"] = [0.22, 1, 0.36, 1];

const headingVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 25,
  },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.65,
      ease: EASE,
    },
  },
};

const listVariants: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.15,
    },
  },
};

const itemVariants: Variants = {
  hidden: {
    opacity: 0,
    x: 30,
  },
  show: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.55,
      ease: EASE,
    },
  },
};

function PortfolioButton({
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
        border-white
        bg-transparent
        px-6
        py-3
        text-[11px]
        font-semibold
        uppercase
        tracking-[0.14em]
        text-white
        transition-colors
        duration-300
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
          bg-white
          transition-transform
          duration-500
          ease-out
          group-hover:scale-x-100
        "
      />

      <span className="relative z-10 flex items-center gap-4">
        <span className="transition-colors duration-300 group-hover:text-[#071a33]">
          {children}
        </span>

        <ArrowRight
          className="
            h-4
            w-4
            text-white
            transition-all
            duration-300
            group-hover:translate-x-1
            group-hover:text-[#071a33]
          "
        />
      </span>
    </Link>
  );
}

function MobileBackground() {
  return (
    <div
      aria-hidden="true"
      className="
        pointer-events-none
        absolute
        inset-0
        z-0
        overflow-hidden
        bg-[#071a33]
      "
    >
      <div
        className="
          absolute
          inset-0
          opacity-[0.045]
          [background-image:linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)]
          [background-size:80px_80px]
        "
      />

      <svg
        className="
          absolute
          right-[-12%]
          top-[20%]
          h-[520px]
          w-[85%]
          opacity-[0.09]
        "
        viewBox="0 0 800 520"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M20 500C160 270 330 80 790 30"
          stroke="white"
          strokeWidth="1"
        />

        <path
          d="M80 520C220 320 395 140 800 90"
          stroke="white"
          strokeWidth="1"
          opacity="0.65"
        />

        <path
          d="M190 520C320 390 480 220 800 165"
          stroke="white"
          strokeWidth="1"
          opacity="0.4"
        />

        <path
          d="M330 520C445 425 585 300 800 245"
          stroke="white"
          strokeWidth="1"
          opacity="0.22"
        />
      </svg>

      <div
        className="
          absolute
          -right-40
          top-[25%]
          h-[500px]
          w-[500px]
          rounded-full
          bg-[#1d4f91]
          opacity-20
          blur-[130px]
        "
      />

      <div
        className="
          absolute
          -bottom-40
          -left-40
          h-[420px]
          w-[420px]
          rounded-full
          bg-[#0d315c]
          opacity-35
          blur-[120px]
        "
      />
    </div>
  );
}

export function ServicesPortfolio() {
  const [activeIndex, setActiveIndex] = useState(0);

  const reducedMotion = Boolean(useReducedMotion());

  const mobileTrackRef = useRef<HTMLDivElement | null>(null);

  const active = SERVICES[activeIndex];

  /*
   * ================================================================
   * MOBILE SCROLL SYSTEM
   * ================================================================
   *
   * The mobile layout has two completely separate concepts:
   *
   * 1. SCROLL TRACK
   *
   *    500svh
   *
   *    This exists ONLY to provide scroll distance.
   *
   *    It has:
   *      - no background
   *      - no visible content
   *      - no decoration
   *
   * 2. STICKY VISUAL STAGE
   *
   *    100svh
   *
   *    This is the ONLY visible mobile section.
   *
   *    It contains:
   *      - navy background
   *      - architecture
   *      - heading
   *      - image
   *      - service
   *      - counter
   *      - progress
   *
   * The 500svh track therefore never creates an additional
   * visible navy area.
   */

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1023px)");

    let ticking = false;

    const updateMobileService = () => {
      const track = mobileTrackRef.current;

      if (!track || !mediaQuery.matches) {
        return;
      }

      const trackRect = track.getBoundingClientRect();

      /*
       * Distance travelled through the mobile track.
       *
       * When trackRect.top === 0:
       *
       * the sticky stage has reached the top of the viewport.
       */
      const scrolledIntoTrack = Math.max(0, -trackRect.top);

      const viewportHeight = window.innerHeight;

      /*
       * Five services require four transitions:
       *
       * 01 -> 02
       * 02 -> 03
       * 03 -> 04
       * 04 -> 05
       *
       * Each transition occupies one viewport height.
       */
      const transitionDistance = Math.max(1, viewportHeight);

      /*
       * Clamp the progress to four viewport heights.
       */
      const stickyProgress = Math.max(
        0,
        Math.min(
          transitionDistance * (SERVICES.length - 1),
          scrolledIntoTrack,
        ),
      );

      const nextIndex = Math.min(
        SERVICES.length - 1,
        Math.floor(
          stickyProgress / transitionDistance,
        ),
      );

      setActiveIndex((current) => {
        if (current === nextIndex) {
          return current;
        }

        return nextIndex;
      });
    };

    const onScroll = () => {
      if (ticking) {
        return;
      }

      ticking = true;

      window.requestAnimationFrame(() => {
        updateMobileService();
        ticking = false;
      });
    };

    const onResize = () => {
      updateMobileService();
    };

    window.requestAnimationFrame(() => {
      updateMobileService();
    });

    window.addEventListener("scroll", onScroll, {
      passive: true,
    });

    window.addEventListener("resize", onResize);

    mediaQuery.addEventListener("change", onResize);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      mediaQuery.removeEventListener("change", onResize);
    };
  }, []);

  return (
    <section
      className="
        relative
        isolate
        m-0
        w-full
        p-0
        text-white
        bg-transparent
        lg:bg-[#071a33]
      "
    >
      {/* ==========================================================
          MOBILE
      ========================================================== */}

 {/* ==========================================================
    MOBILE
========================================================== */}

<div
  ref={mobileTrackRef}
  className="
    relative
    m-0
    lg:hidden
  "
  style={{
    height: `${SERVICES.length * 100}svh`,
  }}
>
  {/* ========================================================
      FIXED / STICKY VISUAL STAGE

      The track above gives us the scrolling distance.

      This stage stays inside one viewport and the content
      changes as the user moves through the track.
  ======================================================== */}

  <div
    className="
      sticky
      top-0
      h-[100svh]
      w-full
      overflow-hidden
      bg-[#071a33]
    "
  >
    <MobileBackground />

    {/* ======================================================
        MOBILE CONTENT GRID

        Instead of positioning everything independently,
        divide the viewport into controlled areas:

        TOP    = heading
        MIDDLE = image
        BOTTOM = active service
    ====================================================== */}

    <div
      className="
        relative
        z-20
        grid
        h-full
        w-full
        grid-rows-[36svh_32svh_32svh]
        px-5
      "
    >
      {/* ====================================================
          TOP / HEADING
      ==================================================== */}

      <div
        className="
          flex
          min-h-0
          flex-col
          justify-end
          pb-[4svh]
        "
      >
        <div className="flex items-center gap-3">
          <span className="h-px w-7 bg-white/60" />

          <span
            className="
              text-[9px]
              font-semibold
              uppercase
              tracking-[0.28em]
              text-white/60
            "
          >
            What we build
          </span>
        </div>

        <h2
          className="
            mt-3
            max-w-[350px]
            text-[2.05rem]
            font-semibold
            leading-[0.94]
            tracking-[-0.045em]
            text-white
            min-[390px]:text-[2.2rem]
          "
        >
          Projects built
          <br />
          around the way
          <br />
          <span className="text-white/40">
            you live.
          </span>
        </h2>

        <p
          className="
            mt-3
            max-w-[355px]
            text-[10px]
            leading-[1.55]
            text-white/55
            min-[390px]:text-[11px]
          "
        >
          From extensions and loft conversions to complete
          refurbishments and roofing, we deliver carefully
          managed construction projects across London and
          the Home Counties.
        </p>
      </div>

      {/* ====================================================
          MIDDLE / IMAGE

          The image now belongs to its own grid row.

          It can therefore NEVER overlap the heading above
          or the service content below.
      ==================================================== */}

      <div
        className="
          relative
          min-h-0
          self-center
        "
      >
        <div
          className="
            absolute
            inset-x-0
            top-1/2
            h-[26svh]
            -translate-y-1/2
            overflow-hidden
            bg-black
          "
        >
          {/* Architectural outer frame */}
          <div
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              -left-2
              -top-2
              z-50
              h-full
              w-full
              border
              border-white/25
            "
          />

          <AnimatePresence mode="wait">
            <motion.div
              key={active.slug}
              className="absolute inset-0"
              initial={{
                opacity: 0,
                x: reducedMotion ? 0 : 28,
                scale: reducedMotion ? 1 : 1.025,
              }}
              animate={{
                opacity: 1,
                x: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                x: reducedMotion ? 0 : -20,
                scale: reducedMotion ? 1 : 0.99,
              }}
              transition={{
                duration: reducedMotion ? 0.2 : 0.55,
                ease: EASE,
              }}
            >
              <Image
                src={active.image}
                alt={`${active.title} project`}
                fill
                priority
                sizes="100vw"
                className="object-cover object-center"
              />

              {/* Image fade */}
              <div
                className="
                  absolute
                  inset-0
                  bg-gradient-to-t
                  from-[#071a33]
                  via-[#071a33]/15
                  to-transparent
                "
              />

              <div
                className="
                  absolute
                  inset-0
                  bg-[#071a33]/10
                  mix-blend-multiply
                "
              />

              {/* Image label */}
              <div
                className="
                  absolute
                  bottom-0
                  left-0
                  right-0
                  z-20
                  p-4
                "
              >
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="h-px w-6 bg-white/70" />

                  <span
                    className="
                      text-[8px]
                      font-semibold
                      uppercase
                      tracking-[0.25em]
                      text-white/70
                    "
                  >
                    Featured work
                  </span>
                </div>

                <h3
                  className="
                    text-lg
                    font-semibold
                    tracking-[-0.02em]
                    text-white
                  "
                >
                  {active.title}
                </h3>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Counter */}
          <div
            className="
              absolute
              right-3
              top-3
              z-50
              text-[9px]
              font-semibold
              tracking-[0.22em]
              text-white/60
            "
          >
            {active.number} / 0{SERVICES.length}
          </div>

          {/* Progress */}
          <motion.div
            className="
              absolute
              bottom-0
              left-0
              z-50
              h-[3px]
              bg-white
            "
            animate={{
              width: `${((activeIndex + 1) / SERVICES.length) * 100}%`,
            }}
            transition={{
              duration: 0.4,
              ease: EASE,
            }}
          />
        </div>
      </div>

      {/* ====================================================
          BOTTOM / ACTIVE SERVICE
      ==================================================== */}

      <div
        className="
          flex
          min-h-0
          flex-col
          justify-start
          pt-[3svh]
        "
      >
        <div
          className="
            flex
            items-center
            justify-between
            border-b
            border-white/15
            pb-2
          "
        >
          <span
            className="
              text-[8px]
              font-semibold
              uppercase
              tracking-[0.25em]
              text-white/45
            "
          >
            Our services
          </span>

          <span
            className="
              text-[8px]
              uppercase
              tracking-[0.18em]
              text-white/30
            "
          >
            Scroll to explore
          </span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={active.slug}
            initial={{
              opacity: 0,
              y: reducedMotion ? 0 : 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              y: reducedMotion ? 0 : -10,
            }}
            transition={{
              duration: 0.35,
              ease: EASE,
            }}
            className="min-h-0"
          >
            <Link
              href={active.href}
              className="
                group
                flex
                w-full
                items-center
                gap-3
                border-b
                border-white/15
                py-3
              "
            >
              {/* Icon */}
              <div
                className="
                  flex
                  h-9
                  w-9
                  shrink-0
                  items-center
                  justify-center
                  border
                  border-white/20
                  bg-white/[0.04]
                  text-white
                "
              >
                <active.Icon
                  className="h-4 w-4"
                  strokeWidth={1.6}
                />
              </div>

              {/* Text */}
              <div className="min-w-0 flex-1">
                <h3
                  className="
                    text-xs
                    font-semibold
                    uppercase
                    tracking-[0.07em]
                    text-white
                  "
                >
                  {active.title}
                </h3>

                <p
                  className="
                    mt-1
                    line-clamp-2
                    max-w-[330px]
                    text-[9px]
                    leading-4
                    text-white/50
                  "
                >
                  {active.description}
                </p>
              </div>

              {/* Arrow */}
              <div
                className="
                  flex
                  h-8
                  w-8
                  shrink-0
                  items-center
                  justify-center
                  border
                  border-white/25
                  text-white
                "
              >
                <ArrowRight
                  className="
                    h-3.5
                    w-3.5
                    transition-transform
                    duration-300
                    group-hover:translate-x-1
                  "
                />
              </div>
            </Link>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  </div>
</div>

      {/* ==========================================================
          DESKTOP
      ========================================================== */}

      <div
        className="
          relative
          hidden
          min-h-[1250px]
          bg-[#071a33]
          lg:block
        "
      >
        <div
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            inset-0
            overflow-hidden
          "
        >
          <div
            className="
              absolute
              inset-0
              opacity-[0.045]
              [background-image:linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)]
              [background-size:80px_80px]
            "
          />

          <svg
            className="
              absolute
              right-[-8%]
              top-[17%]
              h-[620px]
              w-[72%]
              opacity-[0.13]
            "
            viewBox="0 0 800 620"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M20 575C165 285 315 85 790 35"
              stroke="white"
              strokeWidth="1"
            />

            <path
              d="M90 615C220 355 390 155 800 105"
              stroke="white"
              strokeWidth="1"
              opacity="0.65"
            />

            <path
              d="M205 620C330 425 485 245 800 185"
              stroke="white"
              strokeWidth="1"
              opacity="0.4"
            />

            <path
              d="M340 620C445 480 585 345 800 285"
              stroke="white"
              strokeWidth="1"
              opacity="0.22"
            />
          </svg>

          <div
            className="
              absolute
              -right-40
              top-[22%]
              h-[520px]
              w-[520px]
              rounded-full
              bg-[#1d4f91]
              opacity-20
              blur-[130px]
            "
          />

          <div
            className="
              absolute
              -bottom-40
              -left-40
              h-[450px]
              w-[450px]
              rounded-full
              bg-[#0d315c]
              opacity-35
              blur-[120px]
            "
          />
        </div>

        <div
          className="
            relative
            z-10
            mx-auto
            max-w-7xl
            px-8
            pb-52
            pt-[29vh]
          "
        >
          <motion.div
            variants={headingVariants}
            className="mb-20 max-w-3xl"
          >
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-white/60" />

              <span
                className="
                  text-[10px]
                  font-semibold
                  uppercase
                  tracking-[0.32em]
                  text-white/60
                "
              >
                What we build
              </span>
            </div>

            <h2
              className="
                mt-5
                text-6xl
                font-semibold
                leading-[0.95]
                tracking-[-0.045em]
                text-white
                xl:text-7xl
              "
            >
              Projects built
              <br />
              around the way
              <br />
              <span className="text-white/45">
                you live.
              </span>
            </h2>

            <p
              className="
                mt-7
                max-w-2xl
                text-base
                leading-7
                text-white/60
              "
            >
              From extensions and loft conversions to complete
              refurbishments and roofing, we deliver carefully
              managed construction projects across London and
              the Home Counties.
            </p>
          </motion.div>

          <div className="grid grid-cols-[1.15fr_0.85fr] gap-14">
            <motion.div
              initial={{
                opacity: 0,
                x: reducedMotion ? 0 : -35,
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
                duration: 0.8,
                ease: EASE,
              }}
              className="
                relative
                h-[680px]
                overflow-hidden
                bg-black
              "
            >
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
                  border-white/25
                "
              />

              <AnimatePresence mode="wait">
                <motion.div
                  key={active.slug}
                  className="absolute inset-0"
                  initial={{
                    opacity: 0,
                    x: reducedMotion ? 0 : 35,
                    scale: reducedMotion ? 1 : 1.035,
                  }}
                  animate={{
                    opacity: 1,
                    x: 0,
                    scale: 1,
                  }}
                  exit={{
                    opacity: 0,
                    x: reducedMotion ? 0 : -25,
                    scale: reducedMotion ? 1 : 0.985,
                  }}
                  transition={{
                    duration: reducedMotion ? 0.2 : 0.65,
                    ease: EASE,
                  }}
                >
                  <Image
                    src={active.image}
                    alt={`${active.title} project`}
                    fill
                    priority
                    sizes="60vw"
                    className="object-cover object-center"
                  />

                  <div
                    className="
                      absolute
                      inset-0
                      bg-gradient-to-t
                      from-[#071a33]
                      via-[#071a33]/15
                      to-transparent
                    "
                  />

                  <div className="absolute inset-0 bg-[#071a33]/10 mix-blend-multiply" />

                  <motion.div
                    initial={{
                      opacity: 0,
                      y: reducedMotion ? 0 : 20,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    transition={{
                      duration: 0.5,
                      delay: 0.12,
                      ease: EASE,
                    }}
                    className="
                      absolute
                      bottom-0
                      left-0
                      right-0
                      z-20
                      p-9
                    "
                  >
                    <div className="mb-3 flex items-center gap-3">
                      <span className="h-px w-8 bg-white/70" />

                      <span
                        className="
                          text-[9px]
                          font-semibold
                          uppercase
                          tracking-[0.28em]
                          text-white/70
                        "
                      >
                        Featured work
                      </span>
                    </div>

                    <h3
                      className="
                        text-3xl
                        font-semibold
                        tracking-[-0.02em]
                        text-white
                      "
                    >
                      {active.title}
                    </h3>

                    <p
                      className="
                        mt-2
                        max-w-xl
                        text-sm
                        leading-6
                        text-white/70
                      "
                    >
                      {active.description}
                    </p>

                    <div className="mt-6">
                      <PortfolioButton href={active.href}>
                        Explore project
                      </PortfolioButton>
                    </div>
                  </motion.div>
                </motion.div>
              </AnimatePresence>

              <div
                className="
                  absolute
                  right-6
                  top-6
                  z-40
                  text-[10px]
                  font-semibold
                  tracking-[0.25em]
                  text-white/60
                "
              >
                {active.number} / 0{SERVICES.length}
              </div>

              <motion.div
                className="
                  absolute
                  bottom-0
                  left-0
                  z-40
                  h-[3px]
                  bg-white
                "
                animate={{
                  width: `${((activeIndex + 1) / SERVICES.length) * 100}%`,
                }}
                transition={{
                  duration: 0.5,
                  ease: EASE,
                }}
              />
            </motion.div>

            <motion.div
              variants={listVariants}
              initial="hidden"
              whileInView="show"
              viewport={{
                once: true,
                amount: 0.15,
              }}
              className="flex flex-col justify-center"
            >
              <div
                className="
                  mb-5
                  flex
                  items-center
                  justify-between
                  border-b
                  border-white/15
                  pb-4
                "
              >
                <span
                  className="
                    text-[10px]
                    font-semibold
                    uppercase
                    tracking-[0.28em]
                    text-white/45
                  "
                >
                  Our services
                </span>

                <span
                  className="
                    text-[10px]
                    uppercase
                    tracking-[0.2em]
                    text-white/30
                  "
                >
                  Hover a category
                </span>
              </div>

              <div>
                {SERVICES.map((service, index) => {
                  const selected = activeIndex === index;
                  const Icon = service.Icon;

                  return (
                    <motion.div
                      key={service.slug}
                      variants={itemVariants}
                    >
                      <Link
                        href={service.href}
                        onMouseEnter={() =>
                          setActiveIndex(index)
                        }
                        onFocus={() =>
                          setActiveIndex(index)
                        }
                        className="
                          group
                          relative
                          block
                          w-full
                          border-b
                          border-white/15
                          py-6
                        "
                      >
                        <motion.span
                          aria-hidden="true"
                          className="
                            absolute
                            inset-0
                            -z-10
                            bg-white
                          "
                          initial={false}
                          animate={{
                            opacity: selected ? 1 : 0,
                          }}
                          transition={{
                            duration: 0.35,
                            ease: EASE,
                          }}
                        />

                        <div className="flex items-center gap-5">
                          <div
                            className={`
                              relative
                              flex
                              h-11
                              w-11
                              shrink-0
                              items-center
                              justify-center
                              border
                              transition-all
                              duration-300
                              ${
                                selected
                                  ? "border-[#071a33] bg-[#071a33] text-white"
                                  : "border-white/20 bg-white/[0.03] text-white/60 group-hover:border-white/50 group-hover:text-white"
                              }
                            `}
                          >
                            <Icon
                              className="h-[18px] w-[18px]"
                              strokeWidth={1.6}
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <h3
                              className={`
                                text-base
                                font-semibold
                                uppercase
                                tracking-[0.08em]
                                transition-colors
                                duration-300
                                ${
                                  selected
                                    ? "text-[#071a33]"
                                    : "text-white"
                                }
                              `}
                            >
                              {service.title}
                            </h3>

                            <AnimatePresence initial={false}>
                              {selected && (
                                <motion.p
                                  initial={{
                                    opacity: 0,
                                    height: 0,
                                    y: -5,
                                  }}
                                  animate={{
                                    opacity: 1,
                                    height: "auto",
                                    y: 0,
                                  }}
                                  exit={{
                                    opacity: 0,
                                    height: 0,
                                    y: -5,
                                  }}
                                  transition={{
                                    duration: 0.35,
                                    ease: EASE,
                                  }}
                                  className="
                                    max-w-lg
                                    overflow-hidden
                                    pt-2
                                    text-sm
                                    leading-6
                                    text-[#071a33]/65
                                  "
                                >
                                  {service.description}
                                </motion.p>
                              )}
                            </AnimatePresence>
                          </div>

                          <div
                            className={`
                              flex
                              h-9
                              w-9
                              shrink-0
                              items-center
                              justify-center
                              border
                              transition-all
                              duration-300
                              ${
                                selected
                                  ? "border-[#071a33] bg-[#071a33] text-white"
                                  : "border-white/20 text-white/50 group-hover:border-white group-hover:text-white"
                              }
                            `}
                          >
                            <ArrowRight
                              className="
                                h-4
                                w-4
                                transition-transform
                                duration-300
                                group-hover:translate-x-1
                              "
                            />
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>

              <motion.div
                variants={itemVariants}
                className="mt-8"
              >
                <PortfolioButton href="/portfolio/all">
                  View all projects
                </PortfolioButton>
              </motion.div>
            </motion.div>
          </div>

          <motion.div
            initial={{
              opacity: 0,
              y: reducedMotion ? 0 : 20,
            }}
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            viewport={{
              once: true,
              amount: 0.2,
            }}
            transition={{
              duration: 0.7,
              delay: 0.2,
              ease: EASE,
            }}
            className="
              mt-28
              flex
              flex-col
              gap-5
              border-t
              border-white/15
              pt-8
              md:flex-row
              md:items-center
              md:justify-between
            "
          >
            <div className="flex items-center gap-3">
              <Plus
                className="h-4 w-4 text-white/40"
                strokeWidth={1.5}
              />

              <p
                className="
                  text-[10px]
                  font-semibold
                  uppercase
                  tracking-[0.25em]
                  text-white/40
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
                text-white/35
                md:text-right
              "
            >
              Explore our completed work and see how we approach
              different types of residential construction projects.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}