"use client";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import path from "path";

const links = [
    {
        name: "Dashboard",
        href: "/dashboard",
    },
    {
        name: "Projects",
        href: "/dashboard/projects",
    }, 
   {
        name: "Hero",
        href: "/dashboard/hero",
    },
    {
        name: "Before/After",
        href: "/dashboard/beforeafter",
    },
    {
        name: "Banner Picture",
        href: "/dashboard/banner",  
    },
    {
        name: "Contacts",
        href: "/dashboard/contacts"
    }
];

export function DashboardNavigation() {
    const pathname = usePathname()
    return (
        <>
            {links.map((link) => (
                <Link key={link.href} href={link.href} className={cn(link.href === pathname 
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground")}>
                    {link.name}
                </Link>
            ))}
        </>
    );
}
