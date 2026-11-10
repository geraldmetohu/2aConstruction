import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { googleConfigured } from "@/app/lib/auth/google.server";
import { PASSWORD_RULES } from "@/app/lib/auth/password";
import { listSessions, ROLES } from "@/app/lib/auth/store";
import { currentAccount, currentUser, db, homeFor } from "@/app/lib/auth/session.server";
import { AccountForms } from "./AccountForms";

export const metadata: Metadata = { title: "Your account", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ google?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login?next=/account");
  const a = (await currentAccount())!;
  const sessions = (await listSessions(db(), a.id)).map(s => ({ ...s, current: s.id === a.sessionId, createdAt: new Date(s.createdAt).toISOString(), lastSeenAt: new Date(s.lastSeenAt).toISOString() }));
  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8 md:py-14">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">Your account</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-[#071a33]">{user.name || user.email}</h1>
      <p className="mt-1 text-sm text-neutral-600">{user.email} · {ROLES.find(([k]) => k === user.role)?.[1] ?? user.role}{user.trade ? ` (${user.trade.toLowerCase().replace(/_/g, " ")})` : ""}</p>
      <AccountForms home={homeFor(user.role)} name={user.name} phone={user.phone} email={user.email} hasPassword={user.hasPassword} google={user.google} googleAvailable={googleConfigured()}
        googleLinked={(await searchParams).google === "linked"} rules={PASSWORD_RULES} sessions={sessions} />
    </main>
  );
}
