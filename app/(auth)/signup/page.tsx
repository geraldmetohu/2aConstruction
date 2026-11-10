import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { googleConfigured } from "@/app/lib/auth/google.server";
import { safeNext } from "@/app/lib/auth/password";
import { currentUser, homeFor } from "@/app/lib/auth/session.server";
import { AuthShell } from "../AuthShell";
import { SignupForm } from "../forms";

export const metadata: Metadata = { title: "Create your account", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next, "");
  const user = await currentUser();
  if (user) redirect(homeFor(user.role, next));
  return (
    <AuthShell title="Create your account" lead="It takes a minute. Use the email address we send your quotes to."
      footer={<>Already have an account? <Link href="/login" className="font-semibold text-[#071a33] underline-offset-4 hover:underline">Sign in</Link></>}>
      <SignupForm google={googleConfigured()} next={next} />
    </AuthShell>
  );
}
