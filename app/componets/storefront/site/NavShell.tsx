"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUpRight, ChevronDown, Menu, Phone, X } from "lucide-react";
import { navbarLinks } from "../NavBarLinks";
import { COMPANY } from "./brand";
import { siteFont } from "./fonts";

export interface NavCategory { href: string; title: string; image: string }

/**
 * Site header: the same tabs as before, presented as a modern sticky bar.
 * Portfolio opens a photo menu of project types; a tape measure along the bottom fills as you scroll.
 */
export function NavShell({ categories, account, mobileAccount }: { categories: NavCategory[]; account: ReactNode; mobileAccount: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mega, setMega] = useState(false);
  const [open, setOpen] = useState(false);
  const [mobilePortfolio, setMobilePortfolio] = useState(false);
  const closeTimer = useRef<number | null>(null);

  useEffect(() => {
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setScrolled(window.scrollY > 8);
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
      });
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => { window.removeEventListener("scroll", on); cancelAnimationFrame(raf); };
  }, []);
  useEffect(() => { setOpen(false); setMega(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); setMega(false); } };
    window.addEventListener("keydown", k);
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = ""; };
  }, [open]);

  const isActive = (href: string, children?: { href: string }[]) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href.replace(/\/all$/, "")) || !!children?.some(c => c.href === pathname) || (href.startsWith("/portfolio") && pathname.startsWith("/project/"));
  const showMega = () => { if (closeTimer.current) clearTimeout(closeTimer.current); setMega(true); };
  const hideMega = () => { closeTimer.current = window.setTimeout(() => setMega(false), 160); };
  const imageFor = (href: string) => categories.find(c => c.href === href)?.image ?? "/images/general.jpg";

  return (
    <header className={`${siteFont} sticky inset-x-0 top-0 z-50 border-b transition-[background-color,box-shadow,border-color] duration-300 ${scrolled || mega ? "border-[#071a33]/10 bg-white/90 shadow-[0_10px_30px_-18px_rgba(7,26,51,.35)] backdrop-blur-xl" : "border-transparent bg-white"}`}>
      <div className="mx-auto flex h-[76px] max-w-[1440px] items-center gap-4 px-5 sm:px-8">
        <Link href="/" aria-label="2A Construction home" className="group relative h-12 w-[136px] shrink-0">
          <Image src="/2a_logo_dark.svg" alt="2A Construction" fill priority sizes="136px" className="object-contain object-left transition-transform duration-300 group-hover:scale-[1.03]" />
        </Link>

        <nav aria-label="Main" className="hidden flex-1 justify-center xl:flex">
          <ul className="flex items-center gap-0.5 rounded-full bg-[#071a33]/[0.04] p-1">
            {navbarLinks.map(l => {
              const active = isActive(l.href, l.children);
              const hasMenu = !!l.children;
              return (
                <li key={l.id} onMouseEnter={hasMenu ? showMega : undefined} onMouseLeave={hasMenu ? hideMega : undefined}>
                  <Link href={l.href} aria-current={active ? "page" : undefined} aria-expanded={hasMenu ? mega : undefined} aria-haspopup={hasMenu ? "true" : undefined}
                    onFocus={hasMenu ? showMega : undefined}
                    className={`relative flex items-center gap-1 whitespace-nowrap rounded-full px-3.5 py-2 text-[14px] font-semibold transition-colors duration-300 ${active ? "bg-[#071a33] text-white" : "text-[#071a33]/75 hover:bg-white hover:text-[#071a33] hover:shadow-[0_2px_10px_-4px_rgba(7,26,51,.3)]"}`}>
                    {l.name}
                    {hasMenu && <ChevronDown aria-hidden className={`h-3.5 w-3.5 transition-transform duration-300 ${mega ? "rotate-180" : ""}`} />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto hidden items-center gap-2 xl:flex">
          <a href={COMPANY.phoneHref} aria-label={`Call ${COMPANY.phone}`} className="grid h-10 w-10 place-items-center rounded-full border border-[#071a33]/15 text-[#071a33] transition-colors hover:border-[#071a33] hover:bg-[#071a33] hover:text-white"><Phone className="h-4 w-4" /></a>
          {account}
        </div>

        <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? "Close menu" : "Open menu"}
          className="ml-auto grid h-11 w-11 place-items-center rounded-full border border-[#071a33]/15 text-[#071a33] xl:hidden">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Tape measure: fills as the page scrolls */}
      <div aria-hidden className="absolute inset-x-0 -bottom-px h-[4px]">
        <div className="h-full bg-[#f5b400] [background-image:linear-gradient(90deg,#071a33_1px,transparent_1px)] [background-size:10px_2px] [background-repeat:repeat-x] [background-position:0_100%]"
          style={{ width: `${progress * 100}%`, opacity: progress > 0.004 ? 1 : 0, transition: "opacity 300ms" }} />
      </div>

      {/* Portfolio photo menu */}
      {navbarLinks.filter(l => l.children).map(l => (
        <div key={l.id} onMouseEnter={showMega} onMouseLeave={hideMega}
          className={`absolute inset-x-0 top-full hidden border-t border-[#071a33]/10 bg-white text-[#071a33] shadow-[0_40px_70px_-40px_rgba(7,26,51,.45)] transition-[opacity,transform,visibility] duration-300 xl:block ${mega ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0"}`}>
          <div className="mx-auto grid max-w-[1440px] grid-cols-12 gap-8 px-8 py-8">
            <div className="col-span-3">
              <p className="text-2xl font-extrabold leading-tight [font-stretch:115%]">Portfolio</p>
              <p className="mt-2 text-[15px] leading-relaxed text-[#071a33]/65">Finished projects across London and the South East, with the brief, the build and the photographs.</p>
              <Link href={l.children![0].href} className="group mt-5 inline-flex items-center gap-2 font-semibold">
                <span className="border-b-2 border-[#f5b400] pb-0.5 transition-colors group-hover:border-[#071a33]">See all projects</span><ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            </div>
            <ul className="col-span-9 grid grid-cols-5 gap-3">
              {l.children!.slice(1).map((c, i) => (
                <li key={c.id} style={{ transitionDelay: mega ? `${i * 25}ms` : "0ms" }} className={`transition-[opacity,transform] duration-500 ${mega ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}>
                  <Link href={c.href} className="group block">
                    <span className={`relative block overflow-hidden rounded-lg bg-[#dfe4ea] ${i < 5 ? "aspect-[4/3]" : "aspect-[16/7]"}`}>
                      <Image src={imageFor(c.href)} alt="" fill sizes="220px" className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.08]" />
                      <span className="absolute inset-0 bg-gradient-to-t from-[#071a33]/80 via-[#071a33]/10 to-transparent" />
                      <span className="absolute inset-x-3 bottom-2.5 flex items-center justify-between text-[14px] font-bold text-white">{c.name}<ArrowUpRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" /></span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}

      {/* Mobile menu */}
      <div id="mobile-menu" className={`fixed inset-x-0 bottom-0 top-[76px] overflow-y-auto bg-white text-[#071a33] transition-[opacity,visibility] duration-300 xl:hidden ${open ? "visible opacity-100" : "invisible opacity-0"}`}>
        <nav aria-label="Mobile" className="mx-auto max-w-xl px-5 pb-12 pt-4 sm:px-8">
          <ul>
            {navbarLinks.map((l, i) => {
              const anim = { transition: `transform 500ms cubic-bezier(.22,1,.36,1) ${open ? 40 + i * 40 : 0}ms, opacity 500ms ${open ? 40 + i * 40 : 0}ms`, transform: open ? "none" : "translateY(10px)", opacity: open ? 1 : 0 };
              const active = isActive(l.href, l.children);
              return (
                <li key={l.id} className="border-b border-[#071a33]/10" style={anim}>
                  {l.children ? (
                    <>
                      <button type="button" onClick={() => setMobilePortfolio(v => !v)} aria-expanded={mobilePortfolio} className={`flex w-full items-center justify-between py-4 text-left text-[1.6rem] font-extrabold [font-stretch:112%] ${active ? "text-[#c99400]" : ""}`}>
                        {l.name}<ChevronDown className={`h-6 w-6 transition-transform ${mobilePortfolio ? "rotate-180" : ""}`} />
                      </button>
                      <div className={`grid transition-[grid-template-rows] duration-500 ${mobilePortfolio ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                        <ul className="grid grid-cols-2 gap-2 overflow-hidden">
                          {l.children.map((c, k) => (
                            <li key={c.id} className={k === l.children!.length - 1 && l.children!.length % 2 ? "col-span-2" : ""}>
                              <Link href={c.href} className="relative flex h-20 items-end overflow-hidden rounded-lg p-2.5">
                                <Image src={k === 0 ? "/images/general.jpg" : imageFor(c.href)} alt="" fill sizes="50vw" className="object-cover" />
                                <span className="absolute inset-0 bg-gradient-to-t from-[#071a33]/85 to-transparent" />
                                <span className="relative text-sm font-bold text-white">{c.name}</span>
                              </Link>
                            </li>
                          ))}
                          <li className="col-span-2 h-3" />
                        </ul>
                      </div>
                    </>
                  ) : (
                    <Link href={l.href} className={`flex items-center justify-between py-4 text-[1.6rem] font-extrabold [font-stretch:112%] ${active ? "text-[#c99400]" : ""}`}>
                      {l.name}<ArrowUpRight className="h-5 w-5 opacity-40" />
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="mt-8 grid gap-3">
            <Link href="/contact#quote" className="rounded-lg bg-[#f5b400] px-5 py-4 text-center font-bold text-[#071a33]">Request a free quote</Link>
            <a href={COMPANY.phoneHref} className="flex items-center justify-center gap-2 rounded-lg border-2 border-[#071a33] px-5 py-4 font-bold"><Phone className="h-4 w-4" />{COMPANY.phone}</a>
          </div>
          <div className="mt-8">{mobileAccount}</div>
        </nav>
      </div>
    </header>
  );
}
