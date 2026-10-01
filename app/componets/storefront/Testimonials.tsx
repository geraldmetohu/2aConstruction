"use client";

import { useRef, useState, type PointerEvent } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, Quote, Star } from "lucide-react";

const reviews = [
  {
    source: "Checkatrade",
    sourceLabel: "Verified customer review",
    rating: "10/10",
    quote: "Very responsive, did the job at the time they said and in time.",
    name: "Customer review",
    location: "E5",
    href: "https://www.checkatrade.com/trades/2aconstructionltd/reviews",
  },
  {
    source: "Checkatrade",
    sourceLabel: "Customer review",
    rating: "10/10",
    quote: "Great team, fast work no delays, used them on 3 of my extensions.",
    name: "Customer review",
    location: "EN3",
    href: "https://www.checkatrade.com/trades/2aconstructionltd/reviews",
  },
  {
    source: "Checkatrade",
    sourceLabel: "Verified customer review",
    rating: "10/10",
    quote:
      "I can tell a profressional tradesman from the moment they walk through the door. 2A were absolutely brilliant. ",
    name: "Customer review",
    location: "GU21",
    href: "https://www.checkatrade.com/trades/2aconstructionltd/reviews",
  },
  {
    source: "Federation of Master Builders",
    sourceLabel: "Client testimonial",
    rating: "10/10",
    quote:
      "From the first meeting, the team were professional, friendly and easy to communicate with.",
    name: "Patty Moodley",
    location: "SE10",
    href: "https://www.fmb.org.uk/builder/2a-construction-ltd.html",
  },
];

export default function Testimonials() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const dragStartX = useRef<number | null>(null);
  const dragPointerId = useRef<number | null>(null);
  const didDrag = useRef(false);

  const activeReview = reviews[activeIndex];

  const goTo = (index: number) => {
    setActiveIndex((index + reviews.length) % reviews.length);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    // Ignore clicks on links and non-primary mouse buttons.
    if ((event.target as HTMLElement).closest("a")) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    dragStartX.current = event.clientX;
    dragPointerId.current = event.pointerId;
    didDrag.current = false;
    setIsDragging(false);

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is not required for the swipe to work.
    }
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (
      dragStartX.current === null ||
      dragPointerId.current !== event.pointerId
    ) {
      return;
    }

    const distance = event.clientX - dragStartX.current;

    if (Math.abs(distance) > 8) {
      didDrag.current = true;
      setIsDragging(true);
    }
  };

  const finishPointer = (event: PointerEvent<HTMLDivElement>) => {
    if (
      dragStartX.current === null ||
      dragPointerId.current !== event.pointerId
    ) {
      return;
    }

    const distance = event.clientX - dragStartX.current;

    if (Math.abs(distance) >= 45) {
      goTo(activeIndex + (distance < 0 ? 1 : -1));
    }

    dragStartX.current = null;
    dragPointerId.current = null;
    setIsDragging(false);

    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      // Ignore browsers that do not support pointer capture.
    }

    // Keep the drag flag briefly so a drag does not activate a link.
    window.setTimeout(() => {
      didDrag.current = false;
    }, 0);
  };

  const cancelPointer = () => {
    dragStartX.current = null;
    dragPointerId.current = null;
    setIsDragging(false);
    didDrag.current = false;
  };

  return (
    <section className="testimonials-section relative isolate overflow-hidden py-20 text-[#f5f2e9] md:py-28">
      {/* Animated diagonal brand background */}
      <div aria-hidden="true" className="testimonials-background">
        <div className="testimonial-bg-layer testimonial-bg-one" />
        <div className="testimonial-bg-layer testimonial-bg-two" />
        <div className="testimonial-bg-layer testimonial-bg-three" />
        <div className="testimonial-bg-texture" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col justify-between gap-8 md:mb-16 md:flex-row md:items-end">
          <div>
            <div className="mb-5 flex items-center gap-3">
              <span className="h-[2px] w-10 bg-[#f5b400]" />
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f5b400]">
                Words from our clients
              </span>
            </div>

            <h2 className="max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
              Good work speaks
              <br />
              <span className="text-[#f5b400]">for itself.</span>
            </h2>
          </div>

          <p className="max-w-sm text-sm leading-7 text-white/75 md:text-base">
            A selection of feedback shared by customers on independent review
            platforms.
          </p>
        </div>

        {/* Review slider */}
        <div className="relative">
          <div
            className={`relative min-h-[510px] overflow-hidden border border-white/25 bg-[#25241f]/75 shadow-[0_30px_80px_rgba(0,0,0,0.25)] backdrop-blur-[3px] md:min-h-[420px] ${
              isDragging ? "cursor-grabbing" : "cursor-grab"
            }`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishPointer}
            onPointerCancel={cancelPointer}
            onLostPointerCapture={cancelPointer}
            style={{
              touchAction: "pan-y",
              userSelect: "none",
              WebkitUserSelect: "none",
            }}
            aria-label="Customer reviews. Swipe or drag horizontally to change review."
          >
            <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-20 w-1 bg-[#f5b400]" />

            <div className="grid min-h-[510px] grid-rows-[1fr_auto] md:min-h-[420px] md:grid-cols-[minmax(0,1fr)_230px] md:grid-rows-1">
              {/* Review text */}
              <div className="flex min-h-0 flex-col justify-between p-7 pl-9 sm:p-10 sm:pl-12 md:p-12 md:pl-16">
                <div className="flex min-h-[34px] flex-wrap items-center gap-3">
                  <span className="bg-[#f5b400] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#24221d]">
                    {activeReview.source}
                  </span>
                  <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/60">
                    {activeReview.sourceLabel}
                  </span>
                </div>

                <div
                  className="flex min-h-[220px] flex-1 flex-col justify-center py-7 md:min-h-0 md:py-6"
                  aria-live="polite"
                >
                  <Quote
                    aria-hidden="true"
                    className="mb-5 shrink-0 text-[#f5b400]"
                    size={32}
                    strokeWidth={1.4}
                  />

                  <p className="max-w-4xl text-lg font-medium leading-[1.5] tracking-tight text-[#f5f2e9] sm:text-xl md:text-2xl">
                    “{activeReview.quote}”
                  </p>
                </div>

                <div className="flex flex-col gap-4 border-t border-white/20 pt-5 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {activeReview.name}
                    </p>
                    <p className="mt-1 text-xs text-white/55">
                      {activeReview.location}
                    </p>
                  </div>

                  <Link
                    href={activeReview.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => {
                      if (didDrag.current) event.preventDefault();
                    }}
                    className="group inline-flex w-fit items-center gap-3 text-xs font-semibold uppercase tracking-[0.13em] text-[#f5b400] transition-colors hover:text-white"
                  >
                    Read original review
                    <span className="flex h-9 w-9 items-center justify-center border border-[#f5b400]/60 transition-all group-hover:border-[#f5b400] group-hover:bg-[#f5b400] group-hover:text-[#24221d]">
                      <ArrowUpRight size={16} />
                    </span>
                  </Link>
                </div>
              </div>

              {/* Rating panel */}
              <div className="relative flex flex-row items-center justify-between border-t border-white/20 bg-black/10 px-7 py-5 md:flex-col md:items-start md:justify-between md:border-l md:border-t-0 md:px-8 md:py-10">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">
                    Customer rating
                  </p>

                  <div className="mt-3 flex items-center gap-1">
                    {activeReview.rating === "10/10" ? (
                      Array.from({ length: 5 }).map((_, index) => (
                        <Star
                          key={index}
                          size={15}
                          fill="#f5b400"
                          stroke="#f5b400"
                        />
                      ))
                    ) : (
                      <span className="text-lg font-semibold text-[#f5b400]">
                        {activeReview.rating}
                      </span>
                    )}
                  </div>

                  {activeReview.rating === "10/10" && (
                    <p className="mt-2 text-2xl font-semibold text-white">
                      10<span className="text-sm text-white/55">/10</span>
                    </p>
                  )}
                </div>

                <div className="text-right md:text-left">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">
                    Review
                  </p>
                  <p className="mt-2 font-mono text-2xl font-medium text-white">
                    {String(activeIndex + 1).padStart(2, "0")}
                    <span className="text-white/40">
                      /{String(reviews.length).padStart(2, "0")}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {reviews.map((review, index) => (
                <button
                  key={`${review.source}-${index}`}
                  type="button"
                  onClick={() => goTo(index)}
                  aria-label={`Show review ${index + 1}`}
                  aria-current={activeIndex === index ? "true" : undefined}
                  className={`h-[3px] transition-all duration-300 ${
                    activeIndex === index
                      ? "w-10 bg-[#f5b400]"
                      : "w-5 bg-white/40 hover:bg-white/80"
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => goTo(activeIndex - 1)}
                aria-label="Previous review"
                className="flex h-11 w-11 items-center justify-center border border-white/35 text-white transition-colors hover:border-[#f5b400] hover:bg-[#f5b400] hover:text-[#24221d]"
              >
                <ArrowLeft size={17} />
              </button>

              <button
                type="button"
                onClick={() => goTo(activeIndex + 1)}
                aria-label="Next review"
                className="flex h-11 w-11 items-center justify-center border border-[#f5b400] bg-[#f5b400] text-[#24221d] transition-colors hover:bg-transparent hover:text-[#f5b400]"
              >
                <ArrowRight size={17} />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 border-t border-white/25 pt-6">
          <Link
            href="https://www.checkatrade.com/trades/2aconstructionltd/reviews"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/75 transition-colors hover:text-[#f5b400]"
          >
            More Checkatrade reviews <ArrowUpRight size={14} />
          </Link>

          <Link
            href="https://www.fmb.org.uk/builder/2a-construction-ltd.html"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/75 transition-colors hover:text-[#f5b400]"
          >
            FMB profile <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>

      <style jsx>{`
        .testimonials-section {
          background: #39372f;
        }

        .testimonials-background {
          position: absolute;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          pointer-events: none;
          background: #39372f;
        }

        .testimonial-bg-layer {
          position: absolute;
          top: -20%;
          bottom: -20%;
          left: -50%;
          right: -50%;
          background-size: 100% 100%;
          will-change: transform;
          animation: testimonial-diagonal-slide 16s ease-in-out infinite
            alternate;
        }

        /* Main yellow / charcoal diagonal */
        .testimonial-bg-one {
          background-image: linear-gradient(
            -60deg,
            #f5b400 0%,
            #f5b400 50%,
            #39372f 50%,
            #39372f 100%
          );
          opacity: 0.34;
          animation-duration: 18s;
        }

        /* Softer gold and warm stone diagonal */
        .testimonial-bg-two {
          background-image: linear-gradient(
            -60deg,
            #d99f00 0%,
            #d99f00 50%,
            #716b58 50%,
            #716b58 100%
          );
          opacity: 0.27;
          animation-direction: alternate-reverse;
          animation-duration: 23s;
        }

        /* Deep charcoal diagonal for layered movement */
        .testimonial-bg-three {
          background-image: linear-gradient(
            -60deg,
            #25241f 0%,
            #25241f 50%,
            #8a6810 50%,
            #8a6810 100%
          );
          opacity: 0.2;
          animation-duration: 28s;
        }

        .testimonial-bg-texture {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(
              110deg,
              rgba(37, 36, 31, 0.18),
              rgba(37, 36, 31, 0.04) 50%,
              rgba(37, 36, 31, 0.2)
            ),
            radial-gradient(
              circle at 50% 50%,
              transparent 0,
              rgba(37, 36, 31, 0.2) 100%
            );
        }

        @keyframes testimonial-diagonal-slide {
          0% {
            transform: translateX(-18%);
          }
          100% {
            transform: translateX(18%);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .testimonial-bg-layer {
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}