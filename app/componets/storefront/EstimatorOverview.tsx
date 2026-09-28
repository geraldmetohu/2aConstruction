
"use client";

import Link from "next/link";
import {
  ArrowRight,
  Calculator,
  House,
  Upload,
} from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    number: "01",
    title: "Tell us the project",
    text: "Choose your work and describe what you need.",
    Icon: House,
  },
  {
    number: "02",
    title: "Add your information",
    text: "Upload plans, photos and ideas in one place.",
    Icon: Upload,
  },
  {
    number: "03",
    title: "Set your budget",
    text: "Give us a realistic range for your project.",
    Icon: Calculator,
  },
];

function EstimatorButton({
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
        rounded-none
        border
        border-black
        bg-white
        px-6
        py-3
        text-[11px]
        font-semibold
        uppercase
        tracking-[0.14em]
        text-black
        transition-colors
        duration-300
      "
    >
      {/* Black hover fill */}
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

      {/* Button content */}
      <span className="relative z-10 flex items-center gap-4">
        <span className="transition-colors duration-300 group-hover:text-white">
          {children}
        </span>

        <ArrowRight
          className="
            h-4
            w-4
            text-black
            transition-all
            duration-300
            group-hover:translate-x-1
            group-hover:text-white
          "
        />
      </span>
    </Link>
  );
}

export function EstimatorOverview() {
  return (
    <section className="relative isolate overflow-hidden bg-[#f5b400]">

      {/* =========================================================
          TOP CURVE
      ========================================================== */}
      <svg
        aria-hidden="true"
        viewBox="0 0 1000 180"
        preserveAspectRatio="none"
        className="
          pointer-events-none
          absolute
          left-0
          top-0
          z-0
          h-[150px]
          w-full
          md:h-[190px]
        "
      >
        <path
          d="
            M 0 150
            C 170 140, 350 112, 540 68
            C 720 28, 875 5, 1000 0
            L 1000 0
            L 0 0
            Z
          "
          fill="white"
        />
      </svg>

      {/* =========================================================
          MAIN CONTENT
      ========================================================== */}
      <div
        className="
          relative
          z-10
          mx-auto
          max-w-7xl
          px-6
          pb-40
          pt-40
          md:px-8
          md:pb-48
          md:pt-44
        "
      >
        <div
          className="
            grid
            items-center
            gap-14
            lg:grid-cols-[0.85fr_1.15fr]
            lg:gap-20
          "
        >

          {/* =====================================================
              IMAGE
          ====================================================== */}
          <motion.div
            initial={{ opacity: 0, x: -35 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{
              duration: 0.7,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="
              relative
              mx-auto
              w-full
              max-w-[500px]
            "
          >

            {/* Architectural offset frame */}
            <div
              aria-hidden="true"
              className="
                pointer-events-none
                absolute
                -left-3
                -top-3
                h-full
                w-full
                border
                border-black/60
              "
            />

            {/* =================================================
                IMAGE WRAPPER

                IMPORTANT:
                The image is now a normal block image.
                No absolute positioning.
                No competing z-index layers.
            ================================================== */}
            <div
              className="
                group
                relative
                z-10
                aspect-[4/5]
                w-full
                overflow-hidden
                rounded-[0_0_5rem_0]
                bg-neutral-800
                sm:aspect-[5/4]
                lg:aspect-[4/5]
              "
            >
              <img
                src="/images/estimator_overview.jpg"
                alt="2A Construction project"
                className="
                  block
                  h-full
                  w-full
                  object-cover
                  object-center
                  transition-transform
                  duration-1000
                  ease-[cubic-bezier(0.22,1,0.36,1)]
                  group-hover:scale-[1.04]
                "
              />

              {/* Dark image gradient */}
              <div
                aria-hidden="true"
                className="
                  pointer-events-none
                  absolute
                  inset-0
                  z-10
                  bg-gradient-to-t
                  from-black/70
                  via-black/10
                  to-transparent
                "
              />

              {/* Image text */}
              <div
                className="
                  pointer-events-none
                  absolute
                  bottom-6
                  left-6
                  z-20
                "
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="h-px w-7 bg-[#f5b400]" />

                  <span
                    className="
                      text-[9px]
                      font-semibold
                      uppercase
                      tracking-[0.3em]
                      text-white
                    "
                  >
                    2A Construction
                  </span>
                </div>

                <p
                  className="
                    text-sm
                    font-semibold
                    uppercase
                    leading-5
                    tracking-[0.16em]
                    text-white
                  "
                >
                  Quality spaces
                  <br />
                  built to last
                </p>
              </div>

              {/* Small image hover line */}
              <div
                aria-hidden="true"
                className="
                  absolute
                  bottom-0
                  left-0
                  z-20
                  h-[3px]
                  w-0
                  bg-[#f5b400]
                  transition-all
                  duration-700
                  ease-out
                  group-hover:w-full
                "
              />
            </div>

            {/* Bottom-right architectural detail */}
            <div
              aria-hidden="true"
              className="
                pointer-events-none
                absolute
                -bottom-5
                -right-5
                z-20
                h-20
                w-20
                border-b
                border-r
                border-black/50
              "
            />
          </motion.div>

          {/* =====================================================
              CONTENT
          ====================================================== */}
          <div className="relative z-20">

            {/* Heading */}
            <motion.div
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{
                duration: 0.7,
                delay: 0.1,
              }}
            >
              <p
                className="
                  text-[10px]
                  font-bold
                  uppercase
                  tracking-[0.3em]
                  text-black/70
                "
              >
                Project estimator
              </p>

              <h2
                className="
                  mt-4
                  max-w-2xl
                  text-4xl
                  font-semibold
                  leading-[0.95]
                  tracking-[-0.04em]
                  text-black
                  md:text-6xl
                "
              >
                Start with the
                <br />
                right information.
              </h2>

              <p
                className="
                  mt-6
                  max-w-xl
                  text-base
                  leading-7
                  text-black/70
                  md:text-lg
                "
              >
                Tell us about your project, upload your plans and
                photos, and give us an idea of your budget before
                we arrange the next step.
              </p>
            </motion.div>

            {/* =================================================
                FEATURES
            ================================================== */}
            <div className="mt-9 border-t border-black/20">

              {features.map((feature, index) => {
                const Icon = feature.Icon;

                return (
                  <motion.div
                    key={feature.number}
                    initial={{
                      opacity: 0,
                      x: 25,
                    }}
                    whileInView={{
                      opacity: 1,
                      x: 0,
                    }}
                    viewport={{
                      once: true,
                      amount: 0.2,
                    }}
                    transition={{
                      duration: 0.5,
                      delay: index * 0.08,
                    }}
                    className="
                      group
                      grid
                      grid-cols-[42px_1fr]
                      items-center
                      gap-5
                      border-b
                      border-black/20
                      py-5
                    "
                  >

                    {/* =================================================
                        ICON — LEFT SIDE
                    ================================================== */}
                    <div
                      className="
                        relative
                        flex
                        h-10
                        w-10
                        shrink-0
                        items-center
                        justify-center
                        border
                        border-black/30
                        bg-transparent
                        transition-all
                        duration-400
                        ease-out
                        group-hover:border-black
                        group-hover:bg-black
                        group-hover:rotate-3
                      "
                    >
                      {/* Small corner detail */}
                      <span
                        aria-hidden="true"
                        className="
                          absolute
                          -right-[3px]
                          -top-[3px]
                          h-2
                          w-2
                          border-r
                          border-t
                          border-black
                          opacity-0
                          transition-opacity
                          duration-300
                          group-hover:opacity-100
                        "
                      />

                      <Icon
                        className="
                          h-[17px]
                          w-[17px]
                          text-black
                          transition-all
                          duration-400
                          ease-out
                          group-hover:scale-110
                          group-hover:text-[#f5b400]
                        "
                        strokeWidth={1.7}
                      />
                    </div>

                    {/* =================================================
                        TEXT
                    ================================================== */}
                    <div className="min-w-0">

                      <div className="flex items-center gap-3">
                        <span
                          className="
                            text-[9px]
                            font-bold
                            tracking-[0.2em]
                            text-black/40
                            transition-colors
                            duration-300
                            group-hover:text-black/70
                          "
                        >
                          {feature.number}
                        </span>

                        <span
                          aria-hidden="true"
                          className="
                            h-px
                            w-5
                            bg-black/20
                            transition-all
                            duration-300
                            group-hover:w-8
                            group-hover:bg-black/60
                          "
                        />

                        <h3
                          className="
                            text-sm
                            font-semibold
                            uppercase
                            tracking-[0.08em]
                            text-black
                          "
                        >
                          {feature.title}
                        </h3>
                      </div>

                      <p
                        className="
                          mt-1.5
                          max-w-lg
                          text-sm
                          leading-6
                          text-black/60
                          transition-colors
                          duration-300
                          group-hover:text-black/80
                        "
                      >
                        {feature.text}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* =================================================
                BUTTONS
            ================================================== */}
            <motion.div
              initial={{
                opacity: 0,
                y: 20,
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
                duration: 0.6,
                delay: 0.25,
              }}
              className="
                mt-9
                flex
                flex-wrap
                gap-3
              "
            >
              <EstimatorButton href="/estimator">
                Start the estimator
              </EstimatorButton>

              <EstimatorButton href="/portfolio/all">
                See our projects
              </EstimatorButton>

              {process.env.NEXT_PUBLIC_PREMIUM_ESTIMATOR_ENABLED ===
                "true" && (
                <EstimatorButton href="/premium-estimator">
                  Premium estimate · £50
                </EstimatorButton>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* =========================================================
          BOTTOM CURVE
      ========================================================== */}
      <svg
        aria-hidden="true"
        viewBox="0 0 1000 200"
        preserveAspectRatio="none"
        className="
          pointer-events-none
          absolute
          bottom-0
          left-0
          z-0
          h-[150px]
          w-full
          md:h-[200px]
        "
      >
        <path
          d="
            M 0 200
            C 180 195, 360 170, 540 115
            C 730 58, 875 15, 1000 0
            L 1000 200
            L 0 200
            Z
          "
          fill="white"
        />
      </svg>

      {/* Bottom divider */}
      <div
        className="
          pointer-events-none
          absolute
          bottom-7
          left-1/2
          z-30
          h-px
          w-[calc(100%-3rem)]
          max-w-7xl
          -translate-x-1/2
          bg-black/20
          md:bottom-9
          lg:w-[calc(100%-4rem)]
        "
      />
    </section>
  );
}

