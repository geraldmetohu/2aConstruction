"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { navbarLinks } from "./NavBarLinks";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useKindeAuth } from "@kinde-oss/kinde-auth-nextjs";
import { LoginLink, LogoutLink, RegisterLink } from "@kinde-oss/kinde-auth-nextjs/components";

const ADMIN_EMAILS = new Set(["geraldmetohu@gmail.com", "hasanajaleksios@icloud.com", "ensisako11@gmail.com"]);

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const pathname = usePathname();

  const { user, isAuthenticated } = useKindeAuth();
  const isAdmin = !!user?.email && ADMIN_EMAILS.has(user.email);
  const displayName = user?.given_name || user?.family_name || user?.email || "User";

  // Close on route change
  useEffect(() => {
    setOpen(false);
    setExpandedId(null);
  }, [pathname]);

  // Lock scroll when open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = open ? "hidden" : prev || "";
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, [open]);

  return (
    <>
      {/* Toggle (hamburger -> +) */}
      <button
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="md:hidden relative inline-flex h-10 w-10 items-center justify-center rounded-md border border-amber-500/60 text-white"
      >
        {/* three bars morphing to + */}
        <span
          className={cn(
            "absolute h-0.5 w-6 bg-amber-500 transition-transform duration-300 ease-out",
            open ? "translate-y-0 rotate-90" : "-translate-y-2 rotate-0"
          )}
        />
        <span
          className={cn(
            "absolute h-0.5 w-6 bg-amber-500 transition-opacity duration-300 ease-out",
            open ? "opacity-100" : "opacity-100"
          )}
        />
        <span
          className={cn(
            "absolute h-0.5 w-6 bg-amber-500 transition-all duration-300 ease-out",
            open ? "translate-y-0 opacity-0" : "translate-y-2 opacity-100"
          )}
        />
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/70 z-40"
          onClick={() => {
            setOpen(false);
            setExpandedId(null);
          }}
        />
      )}

      {/* Drawer */}
      <aside
        className={cn(
          "fixed top-0 right-0 h-full w-80 max-w-[88%] z-50 bg-black text-white shadow-xl border-l border-amber-500/30 transition-transform duration-300",
          "flex flex-col",
          open ? "translate-x-0" : "translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-amber-500/30">
          <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-2">
            <Image src="/2a_l.png" alt="2A Construction Logo" width={60} height={36} className="object-contain" />
          </Link>

          <button
            aria-label="Close menu"
            onClick={() => {
              setOpen(false);
              setExpandedId(null);
            }}
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-amber-500/60"
          >
            {/* plus icon (same bars as toggle, forced open-state) */}
            <span className="absolute h-0.5 w-6 bg-amber-500 rotate-90" />
            <span className="absolute h-0.5 w-6 bg-amber-500" />
          </button>
        </div>

        {/* List (accordion for children) */}
        <nav className="p-2">
          {navbarLinks.map((item) => {
            const isActive =
              pathname === item.href || (item.children?.some((c) => c.href === pathname) ?? false);

            if (!item.children) {
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "block px-4 py-3 rounded-md text-base transition",
                    isActive ? "bg-amber-500 text-black" : "hover:bg-amber-500 hover:text-black"
                  )}
                >
                  {item.name}
                </Link>
              );
            }

            const expanded = expandedId === item.id;

            return (
              <div key={item.id} className="px-2 py-1">
                <button
                  onClick={() => setExpandedId(expanded ? null : item.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-2 py-3 rounded-md text-left transition",
                    isActive ? "bg-amber-500 text-black" : "hover:bg-amber-500 hover:text-black"
                  )}
                >
                  <span className="px-2">{item.name}</span>
                  <ChevronDown className={cn("h-4 w-4 transition-transform mr-2", expanded && "rotate-180")} />
                </button>

                {/* Children */}
                {expanded && (
                  <div className="mt-1 space-y-1 pl-4">
                    {item.children!.map((sub) => {
                      const subActive = pathname === sub.href;
                      return (
                        <Link
                          key={sub.id}
                          href={sub.href}
                          onClick={() => {
                            setOpen(false);
                            setExpandedId(null);
                          }}
                          className={cn(
                            "block px-3 py-2 rounded-md text-base transition",
                            subActive ? "bg-amber-500 text-black" : "hover:bg-amber-500 hover:text-black"
                          )}
                        >
                          {sub.name}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Auth footer */}
        <div className="mt-auto p-4 border-t border-amber-500/30">
          {!isAuthenticated ? (
            <div className="grid grid-cols-2 gap-2">
              <LoginLink
                authUrlParams={{ prompt: "login" }}
                postLoginRedirectURL="/dashboard"
                className="inline-flex w-full items-center justify-center rounded-md bg-amber-500 px-4 py-2 font-medium text-black hover:bg-amber-400"
              >
                Sign in
              </LoginLink>
              <RegisterLink className="inline-flex w-full items-center justify-center rounded-md border border-amber-500 px-4 py-2 font-medium text-white hover:bg-white hover:text-black">
                Create account
              </RegisterLink>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm">Hi, {displayName}</span>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <Link
                    href="/dashboard"
                    onClick={() => setOpen(false)}
                    className="rounded-md bg-white/10 px-3 py-2 text-sm hover:bg-white/20"
                  >
                    Dashboard
                  </Link>
                )}
                <LogoutLink className="rounded-md px-3 py-2 text-sm hover:bg-white/10">
                  Sign out
                </LogoutLink>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
