import { type ReactNode } from "react";
import { NavBar } from "../componets/storefront/NavBar";
import Footer from "../componets/storefront/Footer";

export default function StoreFrontLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Accessibility: keyboard users can jump past the nav */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 bg-black text-white px-3 py-2 rounded"
      >
        Skip to content
      </a>

      <div className="[--radius:0px] w-screen overflow-x-hidden m-0 p-0">
        <NavBar />
        <main
          id="main"
          role="main"
          className="w-screen max-w-none m-0 p-0"
        >
          {children}
        </main>
        <Footer />
      </div>
    </>
  );
}
