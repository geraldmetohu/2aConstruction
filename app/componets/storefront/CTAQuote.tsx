"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, ShieldCheck, CheckCircle2, Star } from "lucide-react";
import { useRef, useState, useEffect } from "react";

export function CTAQuote({
  title = "Ready to build? Get a free, no-obligation quote.",
  blurb = "Extensions, lofts, refurbishments, roofing — delivered on time and within budget by a fully insured London team.",
  ctaHref = "/contact#quote",
  ctaText = "Request a Free Quote",
  secondaryHref = "/portfolio/all",
  secondaryText = "View Our Projects",
  imgSrc = "/roof.jpg",
  imgAlt = "Construction team on site",
}: {
  title?: string;
  blurb?: string;
  ctaHref?: string;
  ctaText?: string;
  secondaryHref?: string;
  secondaryText?: string;
  imgSrc?: string;
  imgAlt?: string;
}) {
  // page scroll parallax
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 400], [0, -18]);

  // mouse-follow tilt for the image card
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = (e.clientX - cx) / (r.width / 2);
      const dy = (e.clientY - cy) / (r.height / 2);
      setTilt({ rx: (dy * -6), ry: (dx * 6) }); // max ~6deg
    };
    const onLeave = () => setTilt({ rx: 0, ry: 0 });
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <section className="relative isolate overflow-hidden py-20">
      {/* Animated gradient backdrop */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.8 }}
        className="
          pointer-events-none absolute inset-0 -z-10
          bg-[conic-gradient(from_90deg_at_20%_10%,rgba(10,102,194,.14),transparent_30%),
              conic-gradient(from_0deg_at_80%_15%,rgba(43,177,255,.12),transparent_35%)]
        "
      />
<div
  aria-hidden
  className={`
    pointer-events-none absolute inset-0 -z-10 opacity-70
    bg-[radial-gradient(60rem_40rem_at_10%_120%,rgba(251,191,36,.10),transparent_60%),radial-gradient(50rem_34rem_at_110%_-10%,rgba(16,185,129,.10),transparent_65%)]
    animate-[bgfloat_18s_ease-in-out_infinite]
  `}
/>


      <div className="mx-auto w-full max-w-[120rem] px-4">
        <div className="grid items-stretch gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          {/* LEFT: content panel */}
          <motion.div
            initial={{ opacity: 0, y: 22, filter: "blur(4px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="
              relative overflow-hidden rounded-3xl
              bg-white/80 dark:bg-zinc-900/60 backdrop-blur
              ring-1 ring-black/10 dark:ring-white/10
              p-7 sm:p-9 shadow-md
            "
          >
            {/* shimmer badge */}
<span
  className={`
    inline-flex items-center gap-2 rounded-full px-3 py-1
    text-[11px] font-semibold tracking-wide
    text-[rgb(var(--primary))]
    ring-1 ring-[rgb(var(--primary))]/30
    bg-[linear-gradient(90deg,rgba(10,102,194,.14),rgba(43,177,255,.14),rgba(10,102,194,.14))]
    bg-[length:200%_100%] animate-[shine_4.8s_linear_infinite]
  `}
>

              <ShieldCheck size={14} />
              Fully insured & compliant
            </span>

            <motion.h3
              initial={{ y: 8, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-zinc-50"
            >
              {title}
            </motion.h3>

            <motion.p
              initial={{ y: 8, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: 0.05 }}
              className="mt-3 max-w-prose text-[15px] leading-relaxed text-neutral-700 dark:text-zinc-300"
            >
              {blurb}
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: 0.12 }}
              className="mt-7 flex flex-wrap gap-3"
            >
              <RippleLink
                href={ctaHref}
                className="
                  group inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold
                  text-white bg-[rgb(var(--primary))]
                  hover:brightness-105 active:brightness-95
                  shadow-sm ring-1 ring-[rgb(var(--primary))]/70 relative overflow-hidden
                "
              >
                {ctaText}
                <ArrowRight
                  size={18}
                  className="transition-transform duration-300 group-hover:translate-x-0.5"
                />
              </RippleLink>

              <Link
                href={secondaryHref}
                className="
                  inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold
                  border border-neutral-200 dark:border-zinc-700
                  text-neutral-800 dark:text-zinc-200
                  hover:bg-neutral-50 dark:hover:bg-zinc-800
                  transition
                "
              >
                {secondaryText}
              </Link>
            </motion.div>

            {/* trust chips */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: 0.18 }}
              className="mt-5 flex flex-wrap items-center gap-4 text-sm text-neutral-600 dark:text-zinc-400"
            >
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-emerald-500" />
                Clear fixed quotes
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-sky-500" />
                CHAS / SafeContractor
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Star size={16} className="text-amber-500" />
                4.9/5 reviews
              </span>
            </motion.div>

            {/* animated underline */}
<div
  aria-hidden
  className={`
    mt-6 h-1 w-full rounded-full grad-animated
  `}
/>

          </motion.div>

          {/* RIGHT: interactive image card */}
          <motion.div
            ref={cardRef}
            style={{ y, rotateX: tilt.rx, rotateY: tilt.ry }}
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="
              relative overflow-hidden rounded-3xl
              ring-1 ring-black/10 dark:ring-white/10
              shadow-md bg-neutral-100 dark:bg-neutral-900
              h-72 sm:h-80 lg:h-full min-h-[22rem]
              will-change-transform
            "
          >
            {/* Ken-Burns image */}
            <div className="absolute inset-0 overflow-hidden">
              <Image
                src={imgSrc}
                alt={imgAlt}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover animate-[kenburns_14s_ease-in-out_infinite]"
                priority
              />
            </div>

            {/* glow dots */}
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-[rgb(var(--primary))]/25 blur-2xl" />
              <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-[rgb(var(--accent))]/25 blur-2xl" />
            </div>

            {/* corner label */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent p-4">
              <div className="flex items-center justify-between text-white">
                <p className="text-sm/5 opacity-95">Recent project snapshot</p>
                <Link
                  href={secondaryHref}
                  className="text-xs font-semibold underline underline-offset-2 hover:opacity-90"
                >
                  Explore portfolio
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* local keyframes (scoped) */}
      <style jsx>{`
        @keyframes shine {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes bgfloat {
          0%,100% { transform: translate3d(0,0,0) scale(1); }
          50% { transform: translate3d(-1.5%, 1.2%, 0) scale(1.02); }
        }
        @keyframes kenburns {
          0% { transform: scale(1.02); }
          50% { transform: scale(1.08); }
          100% { transform: scale(1.02); }
        }
      `}</style>
    </section>
  );
}

/* —— Ripple button (simple, lightweight) —— */
function RippleLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLAnchorElement | null>(null);

  const onClick = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const ripple = document.createElement("span");
    const rect = el.getBoundingClientRect();
    const d = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = `${d}px`;
    ripple.style.left = `${e.clientX - rect.left - d / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - d / 2}px`;
    ripple.className =
      "pointer-events-none absolute rounded-full bg-white/25 animate-[ripple_700ms_ease-out_1]";
    el.appendChild(ripple);
    setTimeout(() => ripple.remove(), 700);
  };

  return (
    <>
      <Link ref={ref} href={href} onClick={onClick} className={className}>
        {children}
      </Link>
      <style jsx>{`
        @keyframes ripple {
          from { transform: scale(0); opacity: 0.6; }
          to { transform: scale(2.8); opacity: 0; }
        }
      `}</style>
    </>
  );
}
