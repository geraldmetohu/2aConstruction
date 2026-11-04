"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Building2, ExternalLink, Menu } from "lucide-react";
import { navSections } from "./nav-config";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const isActive = (pathname: string, href: string) => href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(href + "/");

export function currentPageName(pathname: string) {
  for (const s of navSections) for (const l of s.links) if (isActive(pathname, l.href)) return l.name;
  return "Dashboard";
}

/** The list of grouped links, used by both the desktop sidebar and the mobile drawer. */
export function DashboardNavigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Dashboard" className="space-y-5">
      {navSections.map(section => (
        <div key={section.title}>
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">{section.title}</p>
          <ul className="mt-1.5 space-y-0.5">
            {section.links.map(link => {
              const active = isActive(pathname, link.href);
              const Icon = link.icon;
              return (
                <li key={link.href}>
                  <Link href={link.href} onClick={onNavigate} title={link.hint} aria-current={active ? "page" : undefined}
                    className={cn("group flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                      active ? "bg-amber-500 text-neutral-950" : "text-neutral-300 hover:bg-white/10 hover:text-white")}>
                    <Icon className={cn("h-4 w-4 shrink-0", active ? "text-neutral-950" : "text-neutral-400 group-hover:text-amber-400")} />
                    <span className="truncate">{link.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5 px-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 text-neutral-950"><Building2 className="h-5 w-5" /></span>
      <span className="leading-tight"><span className="block text-sm font-black text-white">2A Construction</span><span className="block text-xs text-neutral-400">Admin</span></span>
    </Link>
  );
}

function ViewSite() {
  return (
    <Link href="/" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-neutral-400 hover:bg-white/10 hover:text-white">
      <ExternalLink className="h-4 w-4" /> View website
    </Link>
  );
}

/** Fixed left sidebar on desktop. */
export function DashboardSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-neutral-950 lg:flex">
      <div className="py-4"><Brand /></div>
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        <DashboardNavigation />
      </div>
      <div className="border-t border-white/10 p-3"><ViewSite /></div>
    </aside>
  );
}

/** Menu button + slide-out drawer on mobile and tablet; closes after choosing a page. */
export function MobileDashboardNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => { setOpen(false); }, [pathname]);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-200 lg:hidden" aria-label="Open menu"><Menu className="h-5 w-5" /></button>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-72 flex-col gap-0 border-none bg-neutral-950 p-0 text-white">
        <SheetTitle className="sr-only">Dashboard menu</SheetTitle>
        <div className="py-5"><Brand /></div>
        <div className="flex-1 overflow-y-auto px-3 pb-4"><DashboardNavigation onNavigate={() => setOpen(false)} /></div>
        <div className="border-t border-white/10 p-3"><ViewSite /></div>
      </SheetContent>
    </Sheet>
  );
}

/** Title of the current page for the top bar. */
export function CurrentPageTitle() {
  return <h1 className="truncate text-lg font-bold text-neutral-900">{currentPageName(usePathname())}</h1>;
}
