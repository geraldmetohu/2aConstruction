import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/app/(auth)/actions";

/** Our own sign-in links (replace Kinde's LoginLink / RegisterLink / LogoutLink). */
export function SignInLink({ className, children, next }: { className?: string; children: ReactNode; next?: string }) {
  return <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className={className}>{children}</Link>;
}
export function SignUpLink({ className, children }: { className?: string; children: ReactNode }) {
  return <Link href="/signup" className={className}>{children}</Link>;
}
export function SignOutButton({ className, children = "Sign out" }: { className?: string; children?: ReactNode }) {
  return <form action={signOut} className="contents"><button type="submit" className={className}>{children}</button></form>;
}
