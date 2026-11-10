import type { Metadata } from "next";
import { TokenPage } from "../TokenPage";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function EmailSignInPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  return <TokenPage token={(await searchParams).token} purposes={["MAGIC"]} kind="sign-in" title="Sign in" lead="Press the button to finish signing in." />;
}
