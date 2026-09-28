"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const navbarLinks = [
  {
    id: 0,
    name: "Home",
    href: "/",
  },
  {
    id: 1,
    name: "Portfolio",
    href: "/portfolio/all",
    children: [
      {
        id: 11,
        name: "All",
        href: "/portfolio/all",
      },
      {
        id: 12,
        name: "General",
        href: "/portfolio/general",
      },
      {
        id: 13,
        name: "Refurbishment",
        href: "/portfolio/refurbishment",
      },
      {
        id: 14,
        name: "Loft",
        href: "/portfolio/loft",
      },
      {
        id: 15,
        name: "Extention",
        href: "/portfolio/extention",
      },
      {
        id: 16,
        name: "Roofing",
        href: "/portfolio/roof",
      },
      {
        id: 17,
        name: "Painting and Decorating",
        href: "/portfolio/painting",
      },
      {
        id: 18,
        name: "Flooring",
        href: "/portfolio/flooring",
      },
      {
        id: 19,
        name: "Plumbing",
        href: "/portfolio/plumbing",
      },
      {
        id: 20,
        name: "Electrical",
        href: "/portfolio/electrical",
      },
    ],
  },
  {
    id: 7,
    name: "Services",
    href: "/services",
  },
  {
    id: 22,
    name: "Estimator",
    href: "/estimator",
  },
  {
    id: 8,
    name: "About us",
    href: "/about",
  },
  {
    id: 9,
    name: "Contact",
    href: "/contact",
  },
  {
    id: 21,
    name: "Certifiations and Compilance",
    href: "/certifications",
  },
];

export function NavbarLinks() {
  const pathname = usePathname();

  const [open, setOpen] = useState<number | null>(null);

  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      if (
        wrapRef.current &&
        !wrapRef.current.contains(event.target as Node)
      ) {
        setOpen(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(null);
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <nav
      ref={wrapRef}
      className="flex items-center gap-1"
      aria-label="Main navigation"
    >
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
              className={cn(
                "group relative rounded-full px-4 py-2.5 text-sm font-medium transition-all duration-300 ease-out",
                isActive
                  ? "text-black"
                  : "text-neutral-600 hover:-translate-y-0.5 hover:text-black"
              )}
            >
              <span className="relative z-10">
                {item.name}
              </span>

              <span
                className={cn(
                  "absolute inset-x-3 bottom-1 h-0.5 origin-center rounded-full bg-[#f5b400] transition-all duration-300 ease-out",
                  isActive
                    ? "scale-x-100 opacity-100"
                    : "scale-x-0 opacity-0 group-hover:scale-x-100 group-hover:opacity-100"
                )}
              />
            </Link>
          );
        }

        /*
         * Dropdown
         */
        const isOpen = open === item.id;

        return (
          <div
            key={item.id}
            className="relative"
            onMouseEnter={() => setOpen(item.id)}
            onMouseLeave={() => setOpen(null)}
          >
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={isOpen}
              onClick={() =>
                setOpen(isOpen ? null : item.id)
              }
              className={cn(
                "group relative flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-medium transition-all duration-300 ease-out",
                isActive || isOpen
                  ? "text-black"
                  : "text-neutral-600 hover:-translate-y-0.5 hover:text-black"
              )}
            >
              <span className="relative z-10">
                {item.name}
              </span>

              <ChevronDown
                className={cn(
                  "relative z-10 h-4 w-4 transition-transform duration-300 ease-out",
                  isOpen && "rotate-180"
                )}
              />

              <span
                className={cn(
                  "absolute inset-x-3 bottom-1 h-0.5 origin-center rounded-full bg-[#f5b400] transition-all duration-300 ease-out",
                  isActive || isOpen
                    ? "scale-x-100 opacity-100"
                    : "scale-x-0 opacity-0 group-hover:scale-x-100 group-hover:opacity-100"
                )}
              />
            </button>

            <div
              role="menu"
              className={cn(
                "absolute left-0 top-full z-50 pt-3 transition-all duration-300 ease-out",
                isOpen
                  ? "visible translate-y-0 opacity-100"
                  : "pointer-events-none invisible -translate-y-2 opacity-0"
              )}
            >
              <div className="w-64 overflow-hidden rounded-2xl border border-black/[0.08] bg-white p-2 shadow-[0_20px_60px_rgba(0,0,0,0.14)]">
                <div className="mb-1 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                  Portfolio
                </div>

                {item.children.map((sub) => {
                  const subActive = pathname === sub.href;

                  return (
                    <Link
                      href={sub.href}
                      key={sub.id}
                      role="menuitem"
                      onClick={() => setOpen(null)}
                      className={cn(
                        "group relative flex items-center rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ease-out",
                        subActive
                          ? "bg-[#fff8df] font-medium text-black"
                          : "text-neutral-600 hover:translate-x-1 hover:bg-neutral-50 hover:text-black"
                      )}
                    >
                      <span
                        className={cn(
                          "mr-2 h-1.5 w-1.5 rounded-full bg-[#f5b400] transition-all duration-200",
                          subActive
                            ? "scale-100 opacity-100"
                            : "scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100"
                        )}
                      />

                      <span>{sub.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </nav>
  );
}