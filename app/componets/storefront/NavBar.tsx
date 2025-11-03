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
      {/* Full-bleed container with NO left padding so the logo sits flush left */}
      <div className="w-full pr-4 sm:pr-6 lg:pr-6 py-2.5 flex items-center justify-between">
        {/* Left: Logo + Desktop links */}
        <div className="flex items-center gap-3">
          {/* Logo flush to the absolute left edge */}
          <Link
            href="/"
            className="flex items-center gap-3 pl-5 ml-0 pr-28"
            aria-label="Go to homepage"
          >
            <Image
              src="/2a_l.png"
              alt="2A Construction Logo"
              width={148}
              height={148}
              className="h-15 w-auto object-contain"
              priority
            />
          </Link>

          {/* Desktop links — trim inner paddings/borders via child selectors */}
          <div
            className={`
              hidden md:flex items-center
              /* tighten spacing between items */
              gap-1
              /* lighten/trim link paddings + remove heavy borders from children */
              [&_a]:px-3 [&_a]:py-2
              [&_a]:rounded-lg
              [&_a]:border-0
              /* if your items are <li><a/></li>, also tighten li margins */
              [&_li]:mx-0 [&_li]:px-0
              /* subtle hover to replace thick borders */
              [&_a:hover]:bg-white/10
              /* optional: active state look without borders */
              [&_.active]:bg-white/15
            `}
          >
            <NavbarLinks />
          </div>
        </div>

        {/* Right: Auth + Mobile */}
        <div className="flex items-center gap-2">
          {/* Desktop auth controls */}
          <div className="hidden md:flex items-center gap-2">
            {!user ? (
              <>
                <Button asChild className="bg-amber-500 text-black hover:bg-amber-300">
                  <LoginLink authUrlParams={{ prompt: "login" }} postLoginRedirectURL="/dashboard">
                    Sign in
                  </LoginLink>
                </Button>
                <Button asChild className="bg-amber-500 text-black hover:bg-amber-300">
                  <RegisterLink>Create account</RegisterLink>
                </Button>
              </>
            ) : (
              <>
                {isAdmin && (
                  <Button asChild className="bg-amber-500 text-black hover:bg-amber-300">
                    <Link href="/dashboard">Dashboard</Link>
                  </Button>
                )}
                <span className="text-sm opacity-90">Hi, {displayName}</span>
                <Button asChild variant="ghost" className="text-white hover:bg-white/10">
                  <LogoutLink>Sign out</LogoutLink>
                </Button>
              </>
            )}
          </div>

          {/* Mobile menu trigger */}
          <MobileNav />
        </div>
      </div>
    </nav>
  );
}
