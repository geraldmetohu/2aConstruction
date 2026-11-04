import { Archivo } from "next/font/google";

// One family, two voices: Archivo at expanded width for headlines (site-hoarding signage),
// normal width for reading text.
export const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo", display: "swap" });

/** Put on the outer element of a page section that uses the site type. */
export const siteFont = `${archivo.variable} font-[family-name:var(--font-archivo)]`;
