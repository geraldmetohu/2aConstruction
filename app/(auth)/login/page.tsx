import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { googleConfigured } from "@/app/lib/auth/google.server";
import { safeNext } from "@/app/lib/auth/password";
import { currentUser, homeFor } from "@/app/lib/auth/session.server";
import { AuthShell } from "../AuthShell";
import { ClaimForm, LoginForm } from "../forms";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };
export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  "google-off": "Google sign-in isn't switched on yet – use your email instead.", "google-cancelled": "Google sign-in was cancelled.",
  "google-state": "That Google sign-in expired – please try again.", "google-failed": "Google sign-in didn't work – please try again.",
  "google-unverified": "Your Google email isn't verified, so we can't use it.", disabled: "This account is switched off – please call us.", "not-ready": "Sign-in is being set up – try again shortly.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; email?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next, "");
  const user = await currentUser();
  if (user) redirect(homeFor(user.role, next));
  return (
    <AuthShell title="Welcome back" lead="Sign in to see your quotes, project and documents."
      footer={<>New here? <Link href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-[#071a33] underline-offset-4 hover:underline">Create an account</Link></>}>
      {sp.error && ERRORS[sp.error] && <p role="alert" className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{ERRORS[sp.error]}</p>}
      <LoginForm next={next} google={googleConfigured()} initialEmail={typeof sp.email === "string" ? sp.email.slice(0, 200) : ""} />
      <details className="group mt-6 border-t pt-5">
        <summary className="cursor-pointer list-none text-sm font-semibold text-[#071a33]">Got a quote from us? Sign in with its reference <span className="text-neutral-400 group-open:hidden">→</span></summary>
        <p className="mb-3 mt-2 text-xs text-neutral-500">Enter the reference and the site postcode from your quote – we'll email a sign-in link to the address the quote went to.</p>
        <ClaimForm />
      </details>
    </AuthShell>
  );
}
