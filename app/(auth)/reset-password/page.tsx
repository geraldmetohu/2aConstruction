import type { Metadata } from "next";
import { TokenPage } from "../TokenPage";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  return <TokenPage token={(await searchParams).token} purposes={["RESET"]} kind="password" title="Choose a new password"
    lead="This signs you out on every other device. Let your phone or browser suggest a strong password and save it." />;
}
