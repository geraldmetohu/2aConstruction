import Link from "next/link";
import { prisma } from "@/app/lib/db";
import { requireCatalogueAdmin } from "@/app/lib/catalogue/access";
import { deliveryEnabled } from "@/app/lib/delivery/access";
export const dynamic = "force-dynamic";
export default async function DeliveryProjects({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireCatalogueAdmin();
  if (!deliveryEnabled()) return <div className="p-8"><h1 className="text-3xl font-bold">Delivery projects</h1><p className="mt-4">Project conversion is not enabled. Existing projects remain available in their current dashboards.</p></div>;
  const query = await searchParams; const page = Math.min(10000, Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1));
  const projects = await prisma.deliveryProject.findMany({ orderBy: { createdAt: "desc" }, take: 31, skip: (page - 1) * 30, select: { id: true, name: true, createdAt: true, client: { select: { name: true } }, _count: { select: { tasks: true } } } });
  return <div className="space-y-6 p-6"><h1 className="text-3xl font-black">Delivery projects</h1><p>Accepted quote scope and financial baselines. Create a project from a released quote after receiving customer approval.</p><Link href="/dashboard/quotes" className="inline-block rounded-xl border px-4 py-2">Open quotes</Link>{projects.slice(0, 30).map(p => <Link key={p.id} href={`/dashboard/delivery-projects/${p.id}`} className="block rounded-2xl border p-5"><h2 className="font-bold">{p.name}</h2><p className="mt-2 text-sm">{p.client.name} · {p._count.tasks} tasks · {p.createdAt.toISOString().slice(0, 10)}</p></Link>)}{!projects.length && <p>No converted projects yet.</p>}<div className="flex gap-4">{page > 1 && <Link href={`?page=${page - 1}`}>Previous</Link>}{projects.length > 30 && <Link href={`?page=${page + 1}`}>Next</Link>}</div></div>;
}
