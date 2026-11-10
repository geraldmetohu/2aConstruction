import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "../AuthShell";
import { ForgotForm } from "../forms";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false } };

export default function ForgotPage() {
  return (
    <AuthShell title="Forgot your password?" lead="Enter your email and we'll send you a link to choose a new one. Used our old sign-in page before? Do this once to set your password for the new one."
      footer={<Link href="/login" className="font-semibold text-[#071a33] underline-offset-4 hover:underline">← Back to sign in</Link>}>
      <ForgotForm />
    </AuthShell>
  );
}
