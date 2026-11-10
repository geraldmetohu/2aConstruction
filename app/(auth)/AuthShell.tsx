import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarCheck, FileSignature, ShieldCheck, Wallet } from "lucide-react";

const PERKS = [
  { icon: FileSignature, t: "See and sign your quote", d: "Every item, every stage – accept online in a minute." },
  { icon: CalendarCheck, t: "Follow your project", d: "Start date, programme, photos from site and your choices." },
  { icon: Wallet, t: "Stage payments", d: "Invoices as each stage is reached, with what's due next." },
  { icon: ShieldCheck, t: "Your documents, safe", d: "Contract, guarantee, certificates and the H&S file in one place." },
];

/** Split layout: brand panel with a site photo on the left (desktop), the form on the right. */
export function AuthShell({ title, lead, children, footer }: { title: string; lead?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="min-h-[100svh] bg-[#f4f5f7] lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <aside className="relative hidden overflow-hidden bg-[#071a33] text-white lg:block">
        <Image src="/extention.jpeg" alt="" fill priority sizes="50vw" className="object-cover opacity-35" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#071a33]/95 via-[#071a33]/80 to-[#071a33]/40" />
        <div className="relative flex h-full flex-col justify-between p-12 xl:p-16">
          <Link href="/" className="text-sm font-bold tracking-[0.3em] text-[#f5b400]">2A CONSTRUCTION</Link>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#f5b400]">Client &amp; trade area</p>
            <h2 className="mt-3 max-w-md text-4xl font-semibold leading-tight tracking-[-0.02em]">Your build, all in one place.</h2>
            <ul className="mt-10 space-y-5">
              {PERKS.map(p => (
                <li key={p.t} className="flex gap-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/10 text-[#f5b400]"><p.icon className="h-5 w-5" /></span>
                  <span><span className="block font-semibold">{p.t}</span><span className="text-sm text-white/70">{p.d}</span></span>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-white/50">FMB member · SafeContractor approved · London &amp; the South East</p>
        </div>
      </aside>
      <main className="flex min-h-[100svh] flex-col px-5 py-8 sm:px-10">
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="2A Construction home"><Image src="/2a_logo_dark.svg" alt="2A Construction" width={130} height={60} className="h-12 w-auto" priority /></Link>
          <Link href="/" className="text-sm font-semibold text-neutral-600 hover:text-[#071a33]">← Back to site</Link>
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <h1 className="text-3xl font-semibold tracking-[-0.02em] text-[#071a33]">{title}</h1>
          {lead && <p className="mt-2 text-[15px] text-neutral-600">{lead}</p>}
          <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-neutral-600">{footer}</div>}
        </div>
        <p className="text-center text-xs text-neutral-400">Protected sign-in · your password is never stored, only a secure scrambled version of it.</p>
      </main>
    </div>
  );
}
