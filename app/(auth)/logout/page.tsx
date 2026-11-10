import type { Metadata } from "next";
import Link from "next/link";
import { currentUser } from "@/app/lib/auth/session.server";
import { signOut } from "../actions";
import { AuthShell } from "../AuthShell";

export const metadata: Metadata = { title: "Sign out", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function LogoutPage() {
  const user = await currentUser();
  return (
    <AuthShell title={user ? "Sign out?" : "You're signed out"} lead={user ? `Signed in as ${user.email}.` : undefined}>
      {user ? (
        <form action={signOut} className="space-y-3">
          <button className="w-full rounded-xl bg-[#071a33] px-5 py-3.5 text-[15px] font-bold text-white hover:bg-[#0d2a4f]">Sign out</button>
          <Link href="/" className="block text-center text-sm font-semibold text-[#071a33]">Stay signed in</Link>
        </form>
      ) : <Link href="/login" className="block rounded-xl bg-[#071a33] px-5 py-3.5 text-center font-bold text-white">Sign in again</Link>}
    </AuthShell>
  );
}
