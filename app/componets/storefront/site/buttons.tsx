import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

/**
 * The five button styles used across the website.
 *
 *  primary   – the main action on a page (yellow). Use once per section: "Request a free quote", "Book a site visit".
 *  secondary – the alternative next to a primary (navy outline): "See our work", "View membership".
 *  dark      – a strong action on light or yellow backgrounds (navy fill): form submits, the hoarding band.
 *  light     – for photos and dark sections (white outline): heroes, the footer, video panels.
 *  text      – a quiet inline link with an underline that animates: "All services", "Read more".
 *
 * Every style fills from the left on hover, and has a visible focus ring for keyboard users.
 */
export type BtnVariant = "primary" | "secondary" | "dark" | "light" | "text";
type Size = "sm" | "md" | "lg";

const base = "group relative inline-flex items-center justify-center gap-3 overflow-hidden font-semibold transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5b400] disabled:pointer-events-none disabled:opacity-50";
const size: Record<Size, string> = { sm: "px-4 py-2.5 text-sm", md: "px-6 py-3.5 text-[15px]", lg: "px-8 py-4 text-base" };
const look: Record<Exclude<BtnVariant, "text">, { box: string; fill: string; text: string }> = {
  primary: { box: "border-2 border-[#f5b400] bg-[#f5b400] text-[#071a33]", fill: "bg-[#071a33]", text: "group-hover:text-white" },
  secondary: { box: "border-2 border-[#071a33] text-[#071a33]", fill: "bg-[#071a33]", text: "group-hover:text-white" },
  dark: { box: "border-2 border-[#071a33] bg-[#071a33] text-white", fill: "bg-[#f5b400]", text: "group-hover:text-[#071a33]" },
  light: { box: "border-2 border-white/80 text-white", fill: "bg-white", text: "group-hover:text-[#071a33]" },
};

export function btnClass(variant: BtnVariant = "primary", s: Size = "md", extra = "") {
  if (variant === "text") return `group inline-flex items-center gap-2 font-semibold text-[#071a33] ${extra}`;
  return `${base} ${size[s]} ${look[variant].box} ${extra}`;
}

function Inner({ variant, children, arrow }: { variant: BtnVariant; children: ReactNode; arrow: boolean }) {
  if (variant === "text") {
    return (
      <>
        <span className="bg-[linear-gradient(#f5b400,#f5b400)] bg-[length:100%_2px] bg-left-bottom bg-no-repeat pb-0.5 transition-[background-size] duration-500 group-hover:bg-[length:0%_2px] group-hover:bg-right-bottom">{children}</span>
        {arrow && <ArrowRight aria-hidden className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />}
      </>
    );
  }
  const l = look[variant];
  return (
    <>
      <span aria-hidden className={`absolute inset-0 origin-left scale-x-0 transition-transform duration-500 ease-out group-hover:scale-x-100 ${l.fill}`} />
      <span className={`relative z-10 transition-colors duration-300 ${l.text}`}>{children}</span>
      {arrow && <ArrowRight aria-hidden className={`relative z-10 h-4 w-4 transition-all duration-300 group-hover:translate-x-1 ${l.text}`} />}
    </>
  );
}

/** A link styled as a button. */
export function Btn({ href, children, variant = "primary", size: s = "md", external, arrow = true, className = "" }: { href: string; children: ReactNode; variant?: BtnVariant; size?: Size; external?: boolean; arrow?: boolean; className?: string }) {
  const cls = btnClass(variant, s, className);
  const inner = <Inner variant={variant} arrow={arrow}>{children}</Inner>;
  return external || /^(https?:|tel:|mailto:)/.test(href)
    ? <a href={href} className={cls} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{inner}</a>
    : <Link href={href} className={cls}>{inner}</Link>;
}

/** A real <button> in the same styles (forms, toggles). */
export function BtnButton({ children, variant = "primary", size: s = "md", arrow = false, className = "", ...rest }: { children: ReactNode; variant?: BtnVariant; size?: Size; arrow?: boolean; className?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...rest} className={btnClass(variant, s, className)}><Inner variant={variant} arrow={arrow}>{children}</Inner></button>;
}
