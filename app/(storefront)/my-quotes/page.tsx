import type { Metadata } from "next";
import Link from "next/link";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { LoginLink, RegisterLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { ArrowRight, CalendarCheck, Camera, ClipboardCheck, FileText, HardHat, MessageSquare, Wallet } from "lucide-react";
import { prisma } from "@/app/lib/db";
import { listClientQuotes, prismaDb, storageReady } from "@/app/lib/takeoff/store";
import { firstName, HelpCard, PortalHero, Steps } from "./PortalParts";

export const metadata: Metadata = { title: "Client area", robots: { index: false } };
export const dynamic = "force-dynamic";

const status: Record<string, { label: string; tone: string; cta: string }> = {
  SENT: { label: "Waiting for you", tone: "bg-[#f5b400]/15 text-[#8a6500]", cta: "Review quote" },
  ACCEPTED: { label: "Project underway", tone: "bg-emerald-100 text-emerald-800", cta: "Open project" },
  DECLINED: { label: "Declined", tone: "bg-neutral-100 text-neutral-600", cta: "View" },
};

const FEATURES = [
  { icon: FileText, t: "Your quote & documents", d: "Itemised price, scope, contract and guarantee – print or save as PDF." },
  { icon: ClipboardCheck, t: "Choose your finishes", d: "Change options and see the new price instantly before you accept." },
  { icon: CalendarCheck, t: "Progress by stage", d: "See what's happening on site and what's coming next." },
  { icon: Camera, t: "Site photos", d: "Photos from the team as your project goes up." },
  { icon: Wallet, t: "Payments", d: "Your schedule, what's paid and what's next – no surprises." },
  { icon: MessageSquare, t: "Messages", d: "Ask a question or answer ours, all in one place." },
];

export default async function MyQuotesPage() {
  const user = await getKindeServerSession().getUser();

  if (!user?.email) return (
    <>
      <PortalHero eyebrow="Client area" title={<>Your project, <span className="text-[#f5b400]">all in one place.</span></>}
        lead="Sign in with the email address we sent your quote to. New here? Create an account with that same email – it takes a minute.">
        <div className="flex flex-wrap gap-3">
          <LoginLink className="inline-flex items-center gap-2 rounded-xl bg-[#f5b400] px-6 py-3.5 text-sm font-bold text-[#071a33] transition-colors hover:bg-white">Sign in <ArrowRight className="h-4 w-4" /></LoginLink>
          <RegisterLink className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-6 py-3.5 text-sm font-bold text-white transition-colors hover:border-white hover:bg-white hover:text-[#071a33]">Create account</RegisterLink>
        </div>
      </PortalHero>
      <main className="mx-auto max-w-6xl px-5 py-12 sm:px-8 md:py-16">
        <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#071a33]">What you can do here</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(f => (
            <li key={f.t} className="rounded-2xl border border-[#071a33]/10 bg-white p-5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#071a33] text-[#f5b400]"><f.icon className="h-5 w-5" /></span>
              <p className="mt-4 font-semibold text-[#071a33]">{f.t}</p><p className="mt-1 text-sm leading-relaxed text-neutral-600">{f.d}</p>
            </li>
          ))}
        </ul>
      </main>
    </>
  );

  const db = prismaDb(prisma);
  const [quotes, legacy] = await Promise.all([
    (async () => (await storageReady(db)) ? listClientQuotes(db, user.email!) : [])(),
    // Projects in the older client dashboard, so those clients can still reach them from here.
    user.id ? prisma.user.findUnique({ where: { id: user.id }, select: { clients: { select: { id: true } } } }).then(u => u?.clients.length ?? 0).catch(() => 0) : Promise.resolve(0),
  ]);
  const name = firstName(user.given_name) || firstName(user.email.split("@")[0]);
  const waiting = quotes.filter(q => q.status === "SENT");
  const active = quotes.filter(q => q.status === "ACCEPTED");
  const step = active.length ? 4 : waiting.length ? 1 : 1;

  return (
    <>
      <PortalHero eyebrow="Client area" title={<>Welcome{name ? <>, <span className="text-[#f5b400]">{name}</span></> : ""}.</>}
        lead={waiting.length
          ? `You have ${waiting.length === 1 ? "a quote" : `${waiting.length} quotes`} waiting for you. Take your time – read it through, pick your finishes and accept online when you're ready.`
          : active.length ? "Your project page has everything: progress, photos, payments, questions for you and all your documents."
          : "This is your private 2A Construction area. As soon as we send you a quote it will appear here."}>
        <Steps current={step} />
      </PortalHero>

      <main className="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:px-8 md:py-14 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-8">
          {quotes.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[#071a33]/20 bg-white p-8 text-center">
              <HardHat className="mx-auto h-10 w-10 text-[#f5b400]" />
              <p className="mt-4 text-lg font-semibold text-[#071a33]">No quotes yet</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-neutral-600">We send quotes to <strong>{user.email}</strong>. If you were expecting one, it may have gone to a different address – give us a call and we'll sort it.</p>
              <Link href="/contact#enquiry" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#071a33] px-5 py-3 text-sm font-bold text-white hover:bg-[#0d2a4f]">Request a site visit <ArrowRight className="h-4 w-4" /></Link>
            </div>
          )}

          {[{ title: "Waiting for you", list: waiting }, { title: "Your projects", list: active }, { title: "Other quotes", list: quotes.filter(q => q.status !== "SENT" && q.status !== "ACCEPTED") }]
            .filter(g => g.list.length).map(g => (
              <section key={g.title}>
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">{g.title}</h2>
                <ul className="mt-3 space-y-3">
                  {g.list.map(q => {
                    const s = status[q.status] ?? { label: q.status, tone: "bg-neutral-100 text-neutral-700", cta: "Open" };
                    return (
                      <li key={q.id}>
                        <Link href={`/my-quotes/${q.id}`} className="group flex flex-col gap-4 rounded-2xl border border-[#071a33]/10 bg-white p-5 shadow-[0_20px_50px_-40px_rgba(7,26,51,.5)] transition-all hover:-translate-y-0.5 hover:border-[#f5b400] sm:flex-row sm:items-center sm:justify-between sm:p-6">
                          <span className="min-w-0">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs font-semibold tracking-wider text-[#071a33]/60">{q.reference}</span>
                              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.tone}`}>{s.label}</span>
                              {q.unseen > 0 && <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">Updated – please review</span>}
                            </span>
                            <span className="mt-2 block truncate text-lg font-semibold text-[#071a33]">{q.siteAddress || "Your project"}</span>
                          </span>
                          <span className="flex items-center justify-between gap-6 sm:justify-end">
                            {q.gross != null && <span className="text-right"><span className="block text-xs text-neutral-500">Total inc. VAT</span><span className="block text-xl font-semibold tabular-nums text-[#071a33]">£{Math.round(q.gross).toLocaleString("en-GB")}</span></span>}
                            <span className="inline-flex items-center gap-2 rounded-xl bg-[#071a33] px-4 py-2.5 text-sm font-bold text-white transition-colors group-hover:bg-[#f5b400] group-hover:text-[#071a33]">{s.cta}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
        </div>

        <aside className="space-y-5">
          {legacy > 0 && (
            <Link href="/client-dashboard" className="group block rounded-2xl border border-[#071a33]/10 bg-white p-5 transition-colors hover:border-[#f5b400]">
              <p className="font-semibold text-[#071a33]">Your project dashboard</p>
              <p className="mt-1 text-sm text-neutral-600">Stages, photos and notes for your earlier projects with us.</p>
              <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-[#071a33]">Open dashboard <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
            </Link>
          )}
          <HelpCard />
          <div className="rounded-2xl bg-[#f6f7f9] p-5 text-sm text-neutral-600">
            <p className="font-semibold text-[#071a33]">Signed in as</p>
            <p className="mt-1 truncate">{user.email}</p>
            <p className="mt-3 text-xs leading-relaxed">Quotes are linked to this email address. If we have a different one for you, let us know.</p>
          </div>
        </aside>
      </main>
    </>
  );
}
