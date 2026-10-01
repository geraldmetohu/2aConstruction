// app/componets/storefront/ProjectCard.tsx

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface Project {
  id: string;
  name: string;
  description: string;
  images: string[];
}

type Variant = "cover" | "carousel";

interface Props {
  item: Project;
  variant?: Variant;
}

/* ================================================================
   BRAND BUTTON
================================================================ */

function ProjectButton({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="
        group/button
        relative
        flex
        h-12
        w-full
        items-center
        justify-between
        overflow-hidden
        border
        border-[#f5b400]
        bg-[#f5b400]
        px-4
        text-[10px]
        font-bold
        uppercase
        tracking-[0.16em]
        text-[#24221d]
        transition-colors
        duration-300
        hover:text-white
      "
    >
      {/* Animated dark background */}
      <span
        aria-hidden="true"
        className="
          absolute
          inset-0
          origin-left
          scale-x-0
          bg-[#24221d]
          transition-transform
          duration-500
          ease-out
          group-hover/button:scale-x-100
        "
      />

      <span className="relative z-10">View project</span>

      <span
        className="
          relative
          z-10
          flex
          h-7
          w-7
          items-center
          justify-center
          border
          border-[#24221d]/20
          transition-colors
          duration-300
          group-hover/button:border-white/40
        "
      >
        <ArrowRight
          className="
            h-3.5
            w-3.5
            transition-transform
            duration-300
            group-hover/button:translate-x-0.5
          "
        />
      </span>
    </Link>
  );
}

/* ================================================================
   PROJECT CARD
================================================================ */

export function ProjectCard({ item, variant = "cover" }: Props) {
  const cover = item.images?.[0] ?? "/placeholder.png";
  const projectHref = `/project/${item.id}`;

  if (variant === "carousel") {
    return (
      <article className="flex h-full flex-col">
        <Link
          href={projectHref}
          className="group relative block h-[330px] overflow-hidden"
        >
          <Image
            src={cover}
            alt={`${item.name} cover`}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        </Link>

        <div className="flex flex-1 flex-col pt-4">
          <h3 className="text-xl font-semibold tracking-tight text-[#24221d]">
            <Link href={projectHref} className="hover:text-[#9a7400]">
              {item.name}
            </Link>
          </h3>

          <p className="mt-2 line-clamp-2 min-h-[3rem] text-sm leading-6 text-[#777164]">
            {item.description || "Discover more about this project."}
          </p>

          <div className="mt-auto pt-4">
            <ProjectButton href={projectHref} />
          </div>
        </div>
      </article>
    );
  }

  /* ==============================================================
     COVER VARIANT — FEATURED PROJECTS
  ============================================================== */

  return (
    <article
      className="
        group
        relative
        flex
        h-full
        min-h-[470px]
        flex-col
        overflow-hidden
        border
        border-[#24221d]/10
        bg-[#e9e5da]
        transition-all
        duration-500
        hover:border-[#b98a00]/40
      "
    >
      {/* IMAGE WINDOW */}
      <Link
        href={projectHref}
        className="
          group/image
          relative
          block
          h-56
          shrink-0
          overflow-hidden
          bg-[#d8d2c4]
          md:h-64
        "
      >
        <Image
          src={cover}
          alt={`${item.name} cover`}
          fill
          className="
            object-cover
            transition-transform
            duration-700
            ease-out
            group-hover/image:scale-[1.05]
          "
          sizes="(max-width: 768px) 100vw, 33vw"
        />

        {/* Image overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1d1c18]/45 via-transparent to-[#1d1c18]/10" />

        {/* Image grain */}
        <div
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            inset-0
            opacity-[0.1]
            mix-blend-soft-light
            [background-image:radial-gradient(rgba(255,255,255,0.8)_0.5px,transparent_0.7px)]
            [background-size:4px_4px]
          "
        />

        {/* Image label */}
        <div className="absolute left-4 top-4 flex items-center gap-2">
          <span className="h-px w-5 bg-[#f5b400]" />
          <span className="border border-white/25 bg-[#24221d]/65 px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.2em] text-white backdrop-blur-sm">
            Featured project
          </span>
        </div>

        {/* Corner markers */}
        <span className="absolute right-3 top-3 h-5 w-5 border-r border-t border-[#f5b400]/80" />
        <span className="absolute bottom-3 left-3 h-5 w-5 border-b border-l border-white/50" />
      </Link>

      {/* CONTENT WINDOW */}
      <div className="relative flex flex-1 flex-col p-5">
        {/* Subtle texture */}
        <div
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            inset-0
            opacity-[0.035]
            [background-image:radial-gradient(#655f50_0.6px,transparent_0.8px)]
            [background-size:6px_6px]
          "
        />

        {/* Top rule */}
        <div className="absolute left-0 right-0 top-0 h-px bg-white/80" />

        <div className="relative flex flex-1 flex-col">
          {/* Project title */}
          <h3 className="line-clamp-2 min-h-[3.5rem] text-xl font-semibold leading-tight tracking-[-0.035em] text-[#24221d]">
            <Link
              href={projectHref}
              className="transition-colors duration-300 hover:text-[#967000]"
            >
              {item.name}
            </Link>
          </h3>

          {/* Reserved description area keeps every card aligned */}
          <p className="mt-3 min-h-[3.25rem] line-clamp-2 text-[12px] leading-[1.65] text-[#6d675b]">
            {item.description?.trim() ||
              "Discover the details, design and transformation behind this project."}
          </p>

          {/* Button always sits at the bottom */}
          <div className="mt-auto pt-5">
            <ProjectButton href={projectHref} />
          </div>
        </div>
      </div>

      {/* Bottom brand line */}
      <div className="h-[3px] shrink-0 bg-[#f5b400]" />
    </article>
  );
}

/* ================================================================
   LOADING CARD
================================================================ */

export function LoadingProjectCart() {
  return (
    <div
      className="
        flex
        h-full
        min-h-[470px]
        flex-col
        overflow-hidden
        border
        border-[#24221d]/10
        bg-[#e9e5da]
      "
    >
      {/* Image placeholder */}
      <div className="h-56 shrink-0 animate-pulse bg-[#d8d2c4] md:h-64" />

      {/* Content placeholder */}
      <div className="flex flex-1 flex-col p-5">
        <div className="h-6 w-3/4 animate-pulse bg-[#d8d2c4]" />

        <div className="mt-4 space-y-2">
          <div className="h-3 w-full animate-pulse bg-[#d8d2c4]" />
          <div className="h-3 w-4/5 animate-pulse bg-[#d8d2c4]" />
        </div>

        <div className="mt-auto pt-5">
          <div className="h-12 w-full animate-pulse bg-[#d8d2c4]" />
        </div>
      </div>

      <div className="h-[3px] shrink-0 bg-[#d8d2c4]" />
    </div>
  );
}