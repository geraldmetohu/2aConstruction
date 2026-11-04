import "server-only";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/app/lib/db";
import { requireCatalogueAdmin, requireCatalogueEnabled } from "./access";
import { conditions } from "./validation";

type Plain<T> = T extends Date | Prisma.Decimal ? string : T extends Array<infer U> ? Plain<U>[] : T extends object ? { [K in keyof T]: Plain<T[K]> } : T;
function plain<T>(value: T): Plain<T> { return JSON.parse(JSON.stringify(value)) as Plain<T>; }
export async function getLookups() {
  await requireCatalogueAdmin(); requireCatalogueEnabled();
  const [categories, units, labour, suppliers, tax, items] = await Promise.all([
    prisma.itemCategory.findMany({ orderBy: { name: "asc" }, take: 1000 }),
    prisma.itemUnit.findMany({ orderBy: { label: "asc" }, take: 1000 }),
    prisma.labourRole.findMany({ orderBy: { name: "asc" }, take: 1000, include: { rates: { orderBy: { effectiveFrom: "desc" }, take: 30 } } }),
    prisma.supplier.findMany({ orderBy: { name: "asc" }, take: 1000 }),
    prisma.taxCode.findMany({ orderBy: { label: "asc" }, take: 1000, include: { rates: { orderBy: { effectiveFrom: "desc" }, take: 30 } } }),
    prisma.constructionItem.findMany({ orderBy: { name: "asc" }, take: 2000, select: { id: true, code: true, name: true, active: true, archivedAt: true } }),
  ]);
  return plain({ categories, units, labour, suppliers, tax, items });
}
export type Lookups = Awaited<ReturnType<typeof getLookups>>;

export async function getItem(id: string) {
  await requireCatalogueAdmin(); requireCatalogueEnabled();
  const now = new Date();
  const item = await prisma.constructionItem.findUnique({ where: { id }, include: {
    prices: { orderBy: { effectiveFrom: "desc" }, take: 50, include: { taxCode: true } },
    recipes: { where: { publishedAt: { not: null } }, orderBy: { effectiveFrom: "desc" }, take: 60, include: { supportingItems: { include: { supportingItem: true } }, labour: { include: { labourRole: true } } } },
    options: { orderBy: [{ groupCode: "asc" }, { sortOrder: "asc" }], include: { versions: { orderBy: { effectiveFrom: "desc" }, take: 30 } } },
    supplierPrices: { orderBy: { checkedAt: "desc" }, take: 50, include: { supplier: true, unit: true } },
  } });
  if (!item) return null;
  // Current values must not disappear when a different condition has many
  // revisions or the history window fills with future-dated prices.
  const [currentPrice, currentRecipes] = await Promise.all([
    prisma.itemPriceVersion.findFirst({ where: { itemId: id, effectiveFrom: { lte: now } }, orderBy: { effectiveFrom: "desc" } }),
    Promise.all(conditions.map(condition => prisma.itemRecipeVersion.findFirst({
      where: { itemId: id, condition, publishedAt: { not: null }, effectiveFrom: { lte: now } }, orderBy: { effectiveFrom: "desc" },
      include: { supportingItems: { include: { supportingItem: true } }, labour: { include: { labourRole: true } } },
    }))),
  ]);
  return plain({ ...item, currentPrice, currentRecipes: currentRecipes.filter((r): r is NonNullable<typeof r> => r !== null) });
}
export type CatalogueItem = NonNullable<Awaited<ReturnType<typeof getItem>>>;

export async function listItems(query: Record<string, string | string[] | undefined>) {
  await requireCatalogueAdmin(); requireCatalogueEnabled();
  const one = (key: string) => typeof query[key] === "string" ? query[key] as string : "";
  const search = one("q").trim().slice(0, 100);
  const category = z.string().uuid().safeParse(one("category")).success ? one("category") : "";
  const status = ["active", "inactive", "archived", "all"].includes(one("status")) ? one("status") : "active";
  const sort = ["name", "code", "updated", "newest"].includes(one("sort")) ? one("sort") : "name";
  const page = Math.min(100000, Math.max(1, Number.parseInt(one("page"), 10) || 1));
  const where: Prisma.ConstructionItemWhereInput = {
    ...(status === "archived" ? { archivedAt: { not: null } } : status === "all" ? {} : { archivedAt: null, active: status === "active" }),
    ...(category ? { categoryId: category } : {}),
    ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { code: { contains: search, mode: "insensitive" } }, { description: { contains: search, mode: "insensitive" } }] } : {}),
  };
  const orderBy: Prisma.ConstructionItemOrderByWithRelationInput[] = [sort === "code" ? { code: "asc" } : sort === "updated" ? { updatedAt: "desc" } : sort === "newest" ? { createdAt: "desc" } : { name: "asc" }, { id: "asc" }];
  const [total, items, categories] = await Promise.all([
    prisma.constructionItem.count({ where }),
    prisma.constructionItem.findMany({ where, orderBy, skip: (page - 1) * 30, take: 30, include: { category: true, unit: true, prices: { where: { effectiveFrom: { lte: new Date() } }, orderBy: { effectiveFrom: "desc" }, take: 1 } } }),
    prisma.itemCategory.findMany({ orderBy: { name: "asc" }, take: 1000 }),
  ]);
  return plain({ total, items, categories, page, search, category, status, sort });
}
