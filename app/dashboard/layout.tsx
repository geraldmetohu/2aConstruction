import { ReactNode } from "react";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";
import { LogoutLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { CircleUser, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CurrentPageTitle, DashboardSidebar, MobileDashboardNav } from "../componets/dashboard/DashboardNavigation";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  const allowedAdmins = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()) || [];
  const email = user?.email?.toLowerCase();
  if (!email || !allowedAdmins.includes(email)) {
    return redirect("/");
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <DashboardSidebar />
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8 print:hidden">
          <MobileDashboardNav />
          <CurrentPageTitle />
          <div className="ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 rounded-full px-2 sm:px-3">
                  <CircleUser className="h-5 w-5" />
                  <span className="hidden max-w-[14rem] truncate text-sm sm:inline">{user?.given_name || email}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="font-normal"><span className="block text-xs text-neutral-500">Signed in as</span>{email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <LogoutLink className="flex w-full items-center gap-2"><LogOut className="h-4 w-4" /> Log out</LogoutLink>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
