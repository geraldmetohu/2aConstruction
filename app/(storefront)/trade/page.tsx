import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { HardHat } from "lucide-react";
import { currentUser } from "@/app/lib/auth/session.server";
import { defaultRateBook } from "@/app/lib/takeoff/ratebook";

export const metadata: Metadata = { title: "Trade area", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Landing page for trade and staff accounts. Jobs, RAMS and timesheets for their trade come here next. */
export default async function TradePage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/trade");
  if (user.role === "ADMIN") redirect("/dashboard");
  if (user.role === "CLIENT") redirect("/my-quotes");
  const trade = user.trade ? defaultRateBook.trades[user.trade as keyof typeof defaultRateBook.trades]?.name ?? user.trade : user.role === "STAFF" ? "Project manager" : "Trade";
  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#071a33] text-[#f5b400]"><HardHat className="h-6 w-6" /></span>
      <h1 className="mt-4 text-3xl font-semibold tracking-[-0.02em] text-[#071a33]">Hi {user.given_name ?? ""}</h1>
      <p className="mt-2 text-neutral-600">You're signed in as <strong>{trade}</strong>. Your jobs, method statements to sign, site addresses and the quoting tools for your trade will appear here.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/account" className="rounded-xl bg-[#071a33] px-5 py-3 text-sm font-bold text-white">Your account</Link>
        <Link href="/contact" className="rounded-xl border border-neutral-300 px-5 py-3 text-sm font-bold text-[#071a33]">Contact the office</Link>
      </div>
    </main>
  );
}
