import type { Metadata } from "next";
import { TokenPage } from "../TokenPage";

export const metadata: Metadata = { title: "Confirm your email", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  return <TokenPage token={(await searchParams).token} purposes={["VERIFY", "INVITE"]} kind="password" title="Choose your password" cta="Create account & sign in"
    lead="Your email is confirmed. Choose a password – your phone or browser can suggest a strong one and save it for you." />;
}
