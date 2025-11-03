// app/components/storefront/StoreFrontLayout.tsx
import { type ReactNode } from "react";
import { NavBar } from "../componets/storefront/NavBar";
import Footer from "../componets/storefront/Footer";
//import LoadingOverlay from "../componets/storefront/LoadingOverlay";

export default function StoreFrontLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Accessibility: keyboard users can jump past the nav */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[10000] bg-black text-white px-3 py-2 rounded"
      >
        Skip to content
      </a>

      {/* Edge-to-edge container (no horizontal scroll) */}
      <div className="relative w-full overflow-x-clip m-0 p-0">
        {/* Decorative gradient rails (non-interactive) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 -left-24 w-24 bg-gradient-to-r from-amber-500/10 to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 -right-24 w-24 bg-gradient-to-l from-cyan-400/10 to-transparent"
        />

        {/* Soft vignette at top for hero contrast */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-x-0 top-0 h-48 z-0 bg-gradient-to-b from-black/10 to-transparent"
        />

        <NavBar />

        <main id="main" role="main" className="relative z-10 w-full m-0 p-0">
          {children}
        </main>

        <Footer />

        {/* Mount once so it overlays EVERYTHING when active 
        <LoadingOverlay />*/}
      </div>
    </>
  );
}
