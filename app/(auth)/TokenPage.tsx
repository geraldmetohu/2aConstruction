import Link from "next/link";
import { PASSWORD_RULES } from "@/app/lib/auth/password";
import { authReady, peekToken, type TokenPurpose } from "@/app/lib/auth/store";
import { db } from "@/app/lib/auth/session.server";
import { AuthShell } from "./AuthShell";
import { ChoosePasswordForm, EmailLinkForm } from "./forms";

/** Shared page for emailed links. Opening the link never uses it up – only pressing the button does. */
export async function TokenPage({ token, purposes, title, lead, cta, kind }: { token?: string; purposes: TokenPurpose[]; title: string; lead: string; cta?: string; kind: "password" | "sign-in" }) {
  const d = db();
  const t = token && (await authReady(d)) ? await peekToken(d, token, purposes) : null;
  if (!t) return (
    <AuthShell title="This link has expired" lead="Links work for a limited time and only once.">
      <div className="space-y-3 text-sm">
        <Link href="/forgot-password" className="block rounded-xl bg-[#071a33] px-5 py-3.5 text-center font-bold text-white">Send me a new link</Link>
        <Link href="/login" className="block text-center font-semibold text-[#071a33]">Back to sign in</Link>
      </div>
    </AuthShell>
  );
  return (
    <AuthShell title={title} lead={lead}>
      {kind === "password" ? <ChoosePasswordForm token={token!} email={t.email} rules={PASSWORD_RULES} cta={cta} /> : <EmailLinkForm token={token!} email={t.email} />}
    </AuthShell>
  );
}
