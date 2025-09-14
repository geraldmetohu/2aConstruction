import Link from "next/link";
import Image from "next/image";
import { NavbarLinks } from "./NavBarLinks";
import MobileNav from "./MobileNav";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { Button } from "@/components/ui/button";
import { LoginLink, LogoutLink, RegisterLink } from "@kinde-oss/kinde-auth-nextjs/components";

const ADMIN_EMAILS = new Set([
  "geraldmetohu@gmail.com",
  "hasanajaleksios@icloud.com",
]);

export async function NavBar() {
  const { getUser } = getKindeServerSession();
  const user = await getUser();
  const isAdmin = !!user?.email && ADMIN_EMAILS.has(user.email);
  const displayName = user?.given_name || user?.family_name || user?.email || "User";

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-amber-500/20 bg-black text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-6 py-3 flex items-center justify-between">
        {/* Left: Logo + Desktop links */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-3" aria-label="Go to homepage">
            <Image
              src="/2a_l.png"
              alt="2A Construction Logo"
              width={148}
              height={148}
              className="h-10 w-auto object-contain"
              priority
            />
          </Link>
          <NavbarLinks />
        </div>

        {/* Right: Auth + Mobile */}
        <div className="flex items-center gap-3">
          {/* Desktop auth controls */}
          <div className="hidden md:flex items-center gap-2">
            {!user ? (
              <>
                <Button asChild className="bg-amber-500 text-white hover:bg-amber-300 hover:text-black">
                  <LoginLink authUrlParams={{ prompt: "login" }} postLoginRedirectURL="/dashboard">
                    Sign in
                  </LoginLink>
                </Button>
                <Button asChild  className="bg-amber-500 text-white hover:bg-amber-300 hover:text-black">
                  <RegisterLink>Create account</RegisterLink>
                </Button>
              </>
            ) : (
              <>
                {isAdmin && (
                  <Button asChild variant="secondary" className="bg-amber-500 text-white hover:bg-amber-300 hover:text-black">
                    <Link href="/dashboard">Dashboard</Link>
                  </Button>
                )}
                <span className="text-sm">Hi, {displayName}</span>
                <Button asChild variant="ghost" className="text-white hover:bg-white/10">
                  <LogoutLink>Sign out</LogoutLink>
                </Button>
              </>
            )}
          </div>

          {/* Mobile menu trigger (your existing component) */}
          <MobileNav />
        </div>
      </div>
    </nav>
  );
}
