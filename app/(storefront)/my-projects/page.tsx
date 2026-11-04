import Link from "next/link";
import { LoginLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { prisma } from "@/app/lib/db";
import { portalEnabled, requirePortalOwner } from "@/app/lib/customer-portal/access";
import { currentPublication } from "@/app/lib/customer-portal/service";
import type { PublicProject } from "@/app/lib/customer-portal/projection";
export const dynamic = "force-dynamic";
export const metadata = { title: "My projects", robots: { index: false, follow: false } };
export default async function MyProjects({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  if (!portalEnabled()) return <main className="mx-auto max-w-4xl p-8"><h1 className="text-3xl font-bold">My projects</h1><p className="mt-4">The new project portal is not available yet.</p><Link href="/client-dashboard" className="mt-4 inline-block underline">Existing client dashboard</Link></main>;
  let owner: string; try { owner = await requirePortalOwner(); } catch { return <main className="mx-auto max-w-4xl space-y-5 p-8"><h1 className="text-3xl font-bold">Your project, in one place</h1><p>Sign in with the account used for your estimate to view your project updates.</p><LoginLink postLoginRedirectURL="/my-projects">Sign in</LoginLink></main>; }
  const query = await searchParams, page = Math.min(10000, Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1));
  const projects = await prisma.deliveryProject.findMany({ where: { client: { ownerId: owner } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * 20, take: 21, select: { id: true } });
  const shared = await Promise.all(projects.slice(0, 20).map(async p => ({ id: p.id, publication: await currentPublication(prisma, p.id) })));
  return <main className="mx-auto max-w-5xl space-y-6 px-4 py-12"><p className="text-xs uppercase tracking-widest text-neutral-500">2A Construction</p><h1 className="text-4xl font-black">My projects</h1><p>Your shared project updates, agreed scope and conversations with the team.</p>{shared.map(({ id, publication }) => { const snapshot = publication?.status === "SHARED" ? publication.snapshot as unknown as PublicProject : null; return snapshot ? <Link href={`/my-projects/${id}`} key={id} className="block rounded-2xl border p-6"><h2 className="text-xl font-bold">{snapshot.title}</h2><p className="mt-3 text-sm">{snapshot.progress.percent}% complete · Updated {publication!.createdAt.toISOString().slice(0, 10)}</p></Link> : <div key={id} className="rounded-2xl border p-6 text-neutral-600">Your project is awaiting a shared update from the team.</div>; })}{!projects.length && <p className="rounded-2xl border p-6">No projects are linked to this account yet. Contact the team if your project uses another account.</p>}<div className="flex gap-4">{page > 1 && <Link href={`?page=${page - 1}`}>Previous</Link>}{projects.length > 20 && <Link href={`?page=${page + 1}`}>Next</Link>}</div><Link href="/client-dashboard" className="inline-block text-sm underline">Existing client dashboard</Link></main>;
}
