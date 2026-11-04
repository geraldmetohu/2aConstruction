import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/app/lib/db";
import { requirePortalOwner } from "@/app/lib/customer-portal/access";
import { readCustomerProject } from "@/app/lib/customer-portal/service";
import { CustomerProject } from "../CustomerProject";
export const dynamic = "force-dynamic";
export const metadata = { title: "My project", robots: { index: false, follow: false } };
export default async function CustomerProjectPage({ params }: { params: Promise<{ id: string }> }) {
  let owner: string; try { owner = await requirePortalOwner(); } catch { return <main className="p-8"><Link href="/my-projects" className="underline">Sign in to view your projects</Link></main>; }
  const { id } = await params;
  let view; try { view = await readCustomerProject(prisma, id, owner); } catch { notFound(); }
  if (!view) return <main className="mx-auto max-w-4xl p-8"><h1 className="text-2xl font-bold">Project update unavailable</h1><p className="mt-3">The team has not shared an update yet, or is preparing a replacement.</p><Link href="/my-projects" className="mt-4 inline-block underline">My projects</Link></main>;
  return <main className="mx-auto max-w-5xl px-4 py-10"><Link href="/my-projects" className="text-sm underline">← My projects</Link><CustomerProject view={view} /></main>;
}
