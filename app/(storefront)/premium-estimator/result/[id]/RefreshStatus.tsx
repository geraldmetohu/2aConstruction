"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
export function RefreshStatus() {
  const router = useRouter(); const [checks, setChecks] = useState(0);
  useEffect(() => {
    if (checks >= 6) return;
    const timer = setTimeout(() => { router.refresh(); setChecks(n => n + 1); }, 10000);
    return () => clearTimeout(timer);
  }, [checks, router]);
  return <div className="mt-5"><p className="text-sm text-neutral-500">{checks < 6 ? "Checking for an update…" : "Still waiting for confirmation. You can return to this page later."}</p><button onClick={() => { router.refresh(); setChecks(0); }} className="mt-4 rounded-full border border-neutral-300 px-5 py-3 text-sm font-bold">Refresh payment status</button></div>;
}
