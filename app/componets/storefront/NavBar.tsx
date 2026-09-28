import Link from "next/link";
import Image from "next/image";
import { NavbarLinks } from "./NavBarLinks";
import MobileNav from "./MobileNav";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { Button } from "@/components/ui/button";
import { prisma } from "@/app/lib/db";
import {
  LoginLink,
  LogoutLink,
  RegisterLink,
} from "@kinde-oss/kinde-auth-nextjs/components";

const ADMIN_EMAILS = new Set([
  "geraldmetohu@gmail.com",
  "hasanajaleksios@icloud.com",
  "ensisako11@gmail.com",
]);

export async function NavBar() {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  const isAdmin = !!user?.email && ADMIN_EMAILS.has(user.email);

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

  const dashboardHref = isAdmin
    ? "/dashboard"
    : hasClientDashboard
      ? "/client-dashboard"
      : null;

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
                className="rounded-full bg-[#f5b400] px-5 text-black shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#ffc52e] hover:shadow-md"
              >
                <LoginLink
                  authUrlParams={{ prompt: "login" }}
                  postLoginRedirectURL="/api/auth/creation"
                >
                  Sign in
                </LoginLink>
              </Button>

              <Button
                asChild
                className="rounded-full border border-black/[0.10] bg-white px-5 text-neutral-900 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#f5b400] hover:bg-[#fff8df] hover:shadow-md"
              >
                <RegisterLink>Create account</RegisterLink>
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
                    {isAdmin ? "Admin Dashboard" : "My Dashboard"}
                  </Link>
                </Button>
              )}

              <span className="max-w-[160px] truncate px-2 text-sm text-neutral-600">
                Hi, {displayName}
              </span>

              <Button
                asChild
                variant="ghost"
                className="rounded-full text-neutral-700 transition-all duration-300 hover:bg-neutral-100 hover:text-black"
              >
                <LogoutLink>Sign out</LogoutLink>
              </Button>
            </>
          )}
        </div>

        {/* Mobile navigation */}
        <div className="md:hidden">
          <MobileNav
            dashboardHref={dashboardHref}
            dashboardLabel={
              isAdmin ? "Admin Dashboard" : "My Dashboard"
            }
          />
        </div>
      </div>
    </nav>
  );
}