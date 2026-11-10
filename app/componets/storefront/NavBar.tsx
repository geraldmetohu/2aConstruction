import Link from "next/link";
import Image from "next/image";
import { NavbarLinks } from "./NavBarLinks";

// TEMPORARILY DISABLED — customer portal is not ready yet.
// import { portalEnabled } from "@/app/lib/customer-portal/access";

import MobileNav from "./MobileNav";
import { getAuthSession } from "@/app/lib/auth/session.server";
import { Button } from "@/components/ui/button";
import { prisma } from "@/app/lib/db";
import { SignOutButton } from "../auth/AuthLinks";
import { CircleUser } from "lucide-react";

const ADMIN_EMAILS = new Set([
  "geraldmetohu@gmail.com",
  "hasanajaleksios@icloud.com",
  "ensisako11@gmail.com",
]);

export async function NavBar() {
  const { getUser } = getAuthSession();
  const user = await getUser();

  const isAdmin = user?.role === "ADMIN" || (!!user?.email && ADMIN_EMAILS.has(user.email));

  const displayName =
    user?.given_name ||
    user?.family_name ||
    user?.email ||
    "User";

  const dbUser = user?.id
    ? await prisma.user.findUnique({
        where: {
          id: user.id,
        },
        include: {
          clients: true,
        },
      })
    : null;

  const hasClientDashboard = (dbUser?.clients.length ?? 0) > 0;

  /*
   * CUSTOMER PORTAL TEMPORARILY DISABLED
   *
   * The customer portal/access module is not ready yet and is currently
   * causing the Vercel production build to fail.
   *
   * Previously:
   *
   * const dashboardHref = isAdmin
   *   ? "/dashboard"
   *   : portalEnabled()
   *     ? "/my-projects"
   *     : hasClientDashboard
   *     ? "/client-dashboard"
   *     : null;
   *
   * For now, admins can access /dashboard and existing database
   * client users can access /client-dashboard.
   */

  // Admins go to the admin dashboard. Every signed-in client goes to the client area (/my-quotes),
  // which links on to the older project dashboard when they have projects there.
  const dashboardHref = isAdmin
    ? "/dashboard"
    : user
      ? user.role === "TRADE" || user.role === "STAFF" ? "/trade" : "/my-quotes"
      : null;
  void hasClientDashboard;

  // "Your area" links at the top of the phone menu, by role.
  const accountLinks: { href: string; label: string; hint?: string }[] = !user ? [] : isAdmin ? [
    { href: "/dashboard", label: "Dashboard", hint: "Today's list and the business at a glance" },
    { href: "/dashboard/jobs", label: "Jobs", hint: "Progress, photos, payments, snagging" },
    { href: "/dashboard/calculator", label: "New quote" },
    { href: "/dashboard/saved-quotes", label: "Saved quotes" },
    { href: "/account", label: "Account & password" },
  ] : user.role === "TRADE" || user.role === "STAFF" ? [
    { href: "/trade", label: "My jobs" },
    { href: "/account", label: "Account & password" },
  ] : [
    { href: "/my-quotes", label: "My quotes & projects", hint: "Progress, payments, messages, documents" },
    ...(hasClientDashboard ? [{ href: "/client-dashboard", label: "Earlier projects" }] : []),
    { href: "/account", label: "Account & password" },
    { href: "/contact", label: "Contact us" },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-black/[0.08] bg-white text-neutral-900 shadow-sm">
      <div className="mx-auto flex h-[76px] w-full items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* Logo */}
        <div className="flex items-center">
          <Link
            href="/"
            aria-label="Go to homepage"
            className="group flex items-center"
          >
            <Image
              src="/2a_logo_dark.svg"
              alt="2A Construction Logo"
              width={150}
              height={70}
              priority
              className="h-14 w-auto object-contain transition-transform duration-300 group-hover:scale-[1.03]"
            />
          </Link>
        </div>

        {/* Desktop navigation */}
        <div className="hidden md:flex md:flex-1 md:justify-center">
          <NavbarLinks />
        </div>

        {/* Desktop authentication */}
        <div className="hidden items-center gap-2 md:flex">
          {!user ? (
            <>
              <Button
                asChild
                className="group relative mt-0 inline-flex items-center gap-4 overflow-hidden rounded-none border border-black/90 bg-transparent px-6 py-3 text-sm font-medium tracking-wide text-black transition-all duration-300 hover:text-white"
              >
                <Link href="/login">
                  <span className="relative z-10 flex items-center gap-4">
                    <span>Sign in</span>

                    <span className="text-lg leading-none transition-transform duration-300 group-hover:translate-x-1">
                      →
                    </span>
                  </span>

                  <span className="absolute inset-y-0 left-0 z-0 w-full origin-left scale-x-0 bg-black transition-transform duration-500 ease-out group-hover:scale-x-100" />
                </Link>
              </Button>

              <Button
                asChild
                className="group relative mt-0 inline-flex items-center gap-4 overflow-hidden rounded-none border border-black/90 bg-transparent px-6 py-3 text-sm font-medium tracking-wide text-black transition-all duration-300 hover:text-white"
              >
                <Link href="/signup">
                  <span className="relative z-10 flex items-center gap-4">
                    <span>Create account</span>

                    <span className="text-lg leading-none transition-transform duration-300 group-hover:translate-x-1">
                      →
                    </span>
                  </span>

                  <span className="absolute inset-y-0 left-0 z-0 w-full origin-left scale-x-0 bg-black transition-transform duration-500 ease-out group-hover:scale-x-100" />
                </Link>
              </Button>
            </>
          ) : (
            <>
              {dashboardHref && (
                <Button
                  asChild
                  className="rounded-full bg-[#f5b400] px-5 text-black shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#ffc52e] hover:shadow-md"
                >
                  <Link href={dashboardHref}>
                    {isAdmin ? "Admin Dashboard" : "My account"}
                  </Link>
                </Button>
              )}

              <Link href="/account" title="Your account & password" className="max-w-[160px] truncate rounded-full px-3 py-2 text-sm text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-black">
                Hi, {displayName}
              </Link>

              <SignOutButton className="rounded-full px-4 py-2 text-sm font-medium text-neutral-700 transition-all duration-300 hover:bg-neutral-100 hover:text-black" />
            </>
          )}
        </div>

        {/* Mobile navigation: a quick button to your area, then the menu */}
        <div className="flex items-center gap-2 md:hidden">
          {user && dashboardHref && (
            <Link href={dashboardHref} aria-label={isAdmin ? "Admin dashboard" : "Your client area"}
              className="flex h-11 items-center gap-1.5 rounded-full bg-[#f5b400] px-3.5 text-sm font-semibold text-black shadow-sm active:scale-95">
              <CircleUser className="h-5 w-5" />
              <span className="max-[359px]:hidden">{isAdmin ? "Dashboard" : user.role === "TRADE" || user.role === "STAFF" ? "My jobs" : "My area"}</span>
            </Link>
          )}
          <MobileNav
            accountLinks={accountLinks}
            user={user ? { name: displayName, email: user.email } : null}
            isAdmin={isAdmin}
            dashboardHref={dashboardHref}
            dashboardLabel={
              isAdmin ? "Admin Dashboard" : "My account"
            }
          />
        </div>
      </div>
    </nav>
  );
}