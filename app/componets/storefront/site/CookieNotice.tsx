"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export const CONSENT_KEY = "2a-cookie-consent";
export type Consent = { analytics: boolean; at: string };

/** Read the visitor's choice (null if they haven't chosen). Any future analytics must check this first. */
export function readConsent(): Consent | null {
  try { const v = localStorage.getItem(CONSENT_KEY); return v ? (JSON.parse(v) as Consent) : null; } catch { return null; }
}

/**
 * Cookie notice (UK GDPR / PECR). Essential cookies (sign-in, security) are always on.
 * Optional cookies stay off unless the visitor chooses "Accept all". "Cookie settings" in the footer reopens it.
 */
export function CookieNotice() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!readConsent()) setOpen(true);
    const reopen = () => setOpen(true);
    window.addEventListener("open-cookie-settings", reopen);
    return () => window.removeEventListener("open-cookie-settings", reopen);
  }, []);
  const choose = (analytics: boolean) => {
    try { localStorage.setItem(CONSENT_KEY, JSON.stringify({ analytics, at: new Date().toISOString() } satisfies Consent)); } catch { /* private mode */ }
    window.dispatchEvent(new CustomEvent("cookie-consent", { detail: { analytics } }));
    setOpen(false);
  };
  if (!open) return null;
  return (
    <div role="dialog" aria-live="polite" aria-label="Cookie choices" className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-3xl border-2 border-[#071a33] bg-white p-5 text-[#071a33] shadow-[0_30px_60px_-20px_rgba(7,26,51,.45)] sm:inset-x-6 sm:bottom-6 sm:p-6">
      <p className="text-lg font-bold">Cookies on this website</p>
      <p className="mt-2 text-[15px] leading-relaxed text-[#071a33]/75">
        We use essential cookies to keep the site secure and to keep you signed in to your client account. With your permission we may also use analytics cookies to see which pages are useful. We never use advertising cookies. <Link href="/cookies" className="font-semibold underline">Read our cookie policy</Link>.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={() => choose(true)} className="border-2 border-[#071a33] bg-[#071a33] px-5 py-2.5 text-[15px] font-semibold text-white transition-colors hover:bg-[#f5b400] hover:text-[#071a33]">Accept all</button>
        <button type="button" onClick={() => choose(false)} className="border-2 border-[#071a33] px-5 py-2.5 text-[15px] font-semibold transition-colors hover:bg-[#071a33] hover:text-white">Essential only</button>
      </div>
    </div>
  );
}

/** Footer link that reopens the cookie choices. */
export function CookieSettingsLink({ className = "" }: { className?: string }) {
  return <button type="button" onClick={() => window.dispatchEvent(new Event("open-cookie-settings"))} className={className}>Cookie settings</button>;
}
