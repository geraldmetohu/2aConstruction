"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const navbarLinks = [
  { id: 0, name: "Home", href: "/" },
  {
    id: 1,
    name: "Portfolio",
    href: "/portfolio/all",
    children: [
      { id: 11, name: "All", href: "/portfolio/all" },
      { id: 12, name: "General", href: "/portfolio/general" },
      { id: 13, name: "Refurbishment", href: "/portfolio/refurbishment" },
      { id: 14, name: "Loft", href: "/portfolio/loft" },
      { id: 15, name: "Extention", href: "/portfolio/extention" },
      { id: 16, name: "Roofing", href: "/portfolio/roof" },
      { id: 17, name: "Painting and Decorating", href: "/portfolio/painting" },
      { id: 18, name: "Flooring", href: "/portfolio/flooring" },
      { id: 19, name: "Plumbing", href: "/portfolio/plumbing" },
      { id: 20, name: "Electrical", href: "/portfolio/electrical" },

    ],
  },
  { id: 7, name: "Services", href: "/services" },
  { id: 8, name: "About us", href: "/about" },
  { id: 9, name: "Contact", href: "/contact" },
  { id: 21, name: "Certifiations and Compilance", href: "/certifications"}
];

export function NavbarLinks() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click / ESC
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="hidden md:flex items-center gap-x-1" ref={wrapRef}>
      {navbarLinks.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.children?.some((c) => c.href === pathname) ?? false);

        if (!item.children) {
          return (
            <Link
              href={item.href}
              key={item.id}
              className={cn(
                "px-3 py-2 font-medium rounded-md transition",
                isActive ? "text-amber-400" : "text-white hover:text-amber-400 hover:bg-white/5"
              )}
            >
              {item.name}
            </Link>
          );
        }

        return (
          <div key={item.id} className="relative group">
            <button
              type="button"
              aria-haspopup="menu"
              className={cn(
                "flex items-center gap-1 px-3 py-2 font-medium rounded-md transition",
                isActive ? "text-amber-400" : "text-white hover:text-amber-400 hover:bg-white/5"
              )}
            >
              {item.name}
              <ChevronDown className="h-4 w-4 transition-transform group-hover:rotate-180" />
            </button>

            {/* Menu: sits flush under the button (no gap) */}
            <div
              role="menu"
              className={cn(
                "absolute left-0 top-full z-50 w-56 rounded-md border border-amber-500/30 bg-black text-white shadow-xl p-2 ",
                // hidden by default…
                "opacity-0 invisible translate-y-1 transition",
                // …shown on hover/focus within the wrapper
                "group-hover:opacity-100 group-hover:visible group-hover:translate-y-0",
                "focus-within:opacity-100 focus-within:visible focus-within:translate-y-0"
              )}
            >
              {item.children.map((sub) => {
                const subActive = pathname === sub.href;
                return (
                  <Link
                    href={sub.href}
                    key={sub.id}
                    role="menuitem"
                    className={cn(
                      "block px-3 py-2 rounded-md transition",
                      subActive ? "bg-amber-500 text- " : " hover:text-amber-400 hover:bg-white/5"
                    )}
                  >
                    {sub.name}
                  </Link>
                );
              })}
            </div>
          </div>

        );
      })}
    </div>
  );
}
