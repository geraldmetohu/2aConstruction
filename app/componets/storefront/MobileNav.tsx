"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { navbarLinks } from "./NavBarLinks";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { SignOutButton } from "../auth/AuthLinks";

type MobileNavProps = {
  user?: { name: string; email: string } | null;
  /** "Your area" links shown first in the menu when signed in (client area, account, dashboard…). */
  accountLinks?: { href: string; label: string; hint?: string }[];
  isAdmin?: boolean;
  dashboardHref?: string | null;
  dashboardLabel?: string;
};

export default function MobileNav({
  user,
  accountLinks = [],
  isAdmin = false,
  dashboardHref,
  dashboardLabel,
}: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const pathname = usePathname();

  const isAuthenticated = !!user;
  const displayName = user?.name || user?.email || "User";

  /*
   * Close the mobile menu whenever the route changes.
   */
  useEffect(() => {
    setOpen(false);
    setExpandedId(null);
  }, [pathname]);

  /*
   * Prevent the page behind the drawer from scrolling.
   */
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;

    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const closeMenu = () => {
    setOpen(false);
    setExpandedId(null);
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-11 w-11 items-center justify-center rounded-full border border-black/[0.08] bg-white text-neutral-900 shadow-sm transition-all duration-300 ease-out hover:border-[#f5b400] hover:shadow-md active:scale-95"
      >
        <span
          className={cn(
            "absolute h-[1.5px] w-5 bg-neutral-900 transition-all duration-300 ease-out",
            open
              ? "rotate-45"
              : "-translate-y-[5px]"
          )}
        />

        <span
          className={cn(
            "absolute h-[1.5px] w-5 bg-neutral-900 transition-all duration-300 ease-out",
            open
              ? "-rotate-45"
              : "translate-y-[5px]"
          )}
        />
      </button>

      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-[60] bg-black/30 backdrop-blur-[3px] transition-all duration-300 ease-out",
          open
            ? "visible opacity-100"
            : "pointer-events-none invisible opacity-0"
        )}
        onClick={closeMenu}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className={cn(
          "fixed right-0 top-0 z-[70] flex h-full w-[min(390px,90vw)] flex-col bg-white text-neutral-900 shadow-[-20px_0_60px_rgba(0,0,0,0.12)] transition-transform duration-500 ease-out",
          open
            ? "translate-x-0"
            : "translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between border-b border-black/[0.06] px-6 py-5">
          <Link
            href="/"
            onClick={closeMenu}
            className="group flex items-center"
          >
            <Image
              src="/2a_logo_dark.svg"
              alt="2A Construction Logo"
              width={100}
              height={55}
              priority
              className="h-12 w-auto object-contain transition-transform duration-300 ease-out group-hover:scale-105"
            />
          </Link>

          <button
            type="button"
            aria-label="Close menu"
            onClick={closeMenu}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-black/[0.08] transition-all duration-300 ease-out hover:border-[#f5b400] hover:bg-[#fff8df] active:scale-90"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation links */}
        <nav
          className="flex-1 overflow-y-auto px-4 py-6"
          aria-label="Mobile main navigation"
        >
          {accountLinks.length > 0 && (
            <div className="mb-5 rounded-2xl bg-[#071a33] p-2 text-white">
              <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#f5b400]">Your area</p>
              {accountLinks.map((l) => {
                const active = pathname === l.href || (l.href !== "/dashboard" && pathname.startsWith(`${l.href}/`));
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={closeMenu}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-white/10",
                      active && "bg-white/10"
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block text-[15px] font-semibold">{l.label}</span>
                      {l.hint && <span className="block truncate text-xs text-white/60">{l.hint}</span>}
                    </span>
                    <span aria-hidden className="text-[#f5b400]">→</span>
                  </Link>
                );
              })}
            </div>
          )}
          {accountLinks.length > 0 && (
            <p className="px-4 pb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-400">Website</p>
          )}
          {navbarLinks.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.children?.some(
                (child) => child.href === pathname
              ) ??
                false);

            /*
             * Normal link
             */
            if (!item.children) {
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={closeMenu}
                  className={cn(
                    "group relative mb-1 flex items-center rounded-xl px-4 py-3.5 text-[15px] font-medium transition-all duration-300 ease-out hover:translate-x-1 hover:bg-neutral-50 hover:text-black",
                    isActive &&
                      "bg-[#fff8df] text-black"
                  )}
                >
                  <span
                    className={cn(
                      "absolute left-1.5 h-1.5 w-1.5 rounded-full bg-[#f5b400] transition-all duration-300 ease-out",
                      isActive
                        ? "scale-100 opacity-100"
                        : "scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100"
                    )}
                  />

                  <span className="transition-transform duration-300 ease-out group-hover:translate-x-1">
                    {item.name}
                  </span>
                </Link>
              );
            }

            /*
             * Dropdown / accordion
             */
            const expanded = expandedId === item.id;

            return (
              <div key={item.id} className="mb-1">
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() =>
                    setExpandedId(
                      expanded ? null : item.id
                    )
                  }
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-left text-[15px] font-medium text-neutral-700 transition-all duration-300 ease-out hover:bg-neutral-50 hover:text-black",
                    isActive &&
                      "bg-[#fff8df] text-black"
                  )}
                >
                  <span>{item.name}</span>

                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-neutral-400 transition-transform duration-300 ease-out",
                      expanded &&
                        "rotate-180 text-[#d99f00]"
                    )}
                  />
                </button>

                <div
                  className={cn(
                    "grid transition-all duration-300 ease-out",
                    expanded
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0"
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="ml-3 mt-1 border-l border-black/[0.06] pl-3">
                      {item.children.map((sub) => {
                        const subActive =
                          pathname === sub.href;

                        return (
                          <Link
                            key={sub.id}
                            href={sub.href}
                            onClick={closeMenu}
                            className={cn(
                              "group flex items-center rounded-lg px-3 py-2.5 text-sm text-neutral-500 transition-all duration-200 ease-out hover:translate-x-1 hover:bg-neutral-50 hover:text-black",
                              subActive &&
                                "bg-[#fff8df] font-medium text-black"
                            )}
                          >
                            <span
                              className={cn(
                                "mr-2 h-1.5 w-1.5 rounded-full bg-[#f5b400] transition-all duration-200 ease-out",
                                subActive
                                  ? "scale-100 opacity-100"
                                  : "scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100"
                              )}
                            />

                            {sub.name}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

       {/* Authentication footer */}
<div className="border-t border-black/[0.06] bg-neutral-50/70 p-5">
  {!isAuthenticated ? (
    <div className="grid grid-cols-2 gap-2">
      <Link
        href="/login"
        onClick={closeMenu}
        className="group relative flex h-11 items-center justify-center overflow-hidden rounded-none border border-black/90 bg-transparent px-4 text-sm font-medium tracking-wide text-black transition-all duration-300 hover:text-white"
      >
        <span className="relative z-10 flex items-center gap-2">
          <span>Sign in</span>
          <span className="text-lg leading-none transition-transform duration-300 group-hover:translate-x-1">
            →
          </span>
        </span>

        <span className="absolute inset-y-0 left-0 z-0 w-full origin-left scale-x-0 bg-black transition-transform duration-500 ease-out group-hover:scale-x-100" />
      </Link>

      <Link
        href="/signup"
        onClick={closeMenu}
        className="group relative flex h-11 items-center justify-center overflow-hidden rounded-none border border-black/90 bg-transparent px-4 text-sm font-medium tracking-wide text-black transition-all duration-300 hover:text-white"
      >
        <span className="relative z-10 flex items-center gap-2">
          <span>Create account</span>
          <span className="text-lg leading-none transition-transform duration-300 group-hover:translate-x-1">
            →
          </span>
        </span>

        <span className="absolute inset-y-0 left-0 z-0 w-full origin-left scale-x-0 bg-black transition-transform duration-500 ease-out group-hover:scale-x-100" />
      </Link>
    </div>
  
          ) : (
            <div className="space-y-3">
              <Link href="/account" onClick={closeMenu} className="block text-sm text-neutral-500">
                Hi,{" "}
                <span className="font-medium text-neutral-900">
                  {displayName}
                </span>
                <span className="ml-2 text-xs underline underline-offset-2">Account &amp; password</span>
              </Link>

              <div className="flex gap-2">
                {dashboardHref && (
                  <Link
                    href={dashboardHref}
                    onClick={closeMenu}
                    className="flex h-10 flex-1 items-center justify-center rounded-full bg-[#f5b400] px-3 text-sm font-semibold text-black transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-[#ffc52e]"
                  >
                    {dashboardLabel ??
                      (isAdmin
                        ? "Admin Dashboard"
                        : "My Dashboard")}
                  </Link>
                )}

                <SignOutButton className="flex h-10 items-center justify-center rounded-full border border-black/[0.08] bg-white px-4 text-sm text-neutral-700 transition-all duration-300 ease-out hover:bg-black/[0.04] hover:text-black" />
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}