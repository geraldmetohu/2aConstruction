"use client";
import { useEffect } from "react";

/** The friendly "something went wrong" screen. It tells us about the error (once) and lets the visitor retry. */
export function ErrorScreen({ error, reset, homeHref = "/" }: { error: Error & { digest?: string }; reset: () => void; homeHref?: string }) {
  useEffect(() => {
    fetch("/api/errors", { method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true,
      body: JSON.stringify({ message: error.message || "Unknown error", stack: error.stack?.slice(0, 8000), path: location.pathname, digest: error.digest }) }).catch(() => {});
  }, [error]);
  return (
    <div role="alert" className="mx-auto my-16 max-w-lg rounded-2xl border bg-white p-8 text-center shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-600">2A Construction</p>
      <h1 className="mt-2 text-2xl font-black text-neutral-950">Something went wrong</h1>
      <p className="mt-2 text-sm text-neutral-600">Sorry – that page didn&apos;t load properly. We&apos;ve been told about it automatically. Please try again; if it keeps happening, call or email us.</p>
      <div className="mt-6 flex justify-center gap-3">
        <button onClick={reset} className="rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-bold text-white">Try again</button>
        <a href={homeHref} className="rounded-full border px-5 py-2.5 text-sm font-bold">Go back</a>
      </div>
      {error.digest && <p className="mt-4 text-[11px] text-neutral-400">Reference {error.digest}</p>}
    </div>
  );
}
