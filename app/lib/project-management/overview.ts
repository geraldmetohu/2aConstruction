import { Prisma } from "@prisma/client";
import type { Workspace } from "./service";
import { entries } from "./state";
export function summarizeProjects(projects: Workspace[], today: string) {
  const sum = (key: "contractGross" | "invoiceGross" | "received" | "outstanding" | "actualCostNet") => projects.reduce((total, p) => total.plus(p.financials[key]), new Prisma.Decimal(0)).toFixed(2);
  return {
    active: projects.filter(p => entries(p.state, "PROJECT")[0].body.status === "ACTIVE").length,
    nearingCompletion: projects.filter(p => p.progress.percent >= 80 && entries(p.state, "PROJECT")[0].body.status !== "COMPLETED").length,
    proposedVariations: projects.reduce((n, p) => n + entries(p.state, "VARIATION").filter(v => v.body.status === "PROPOSED").length, 0),
    overdueInvoices: projects.reduce((n, p) => n + entries(p.state, "INVOICE").filter(i => i.body.status === "ISSUED" && i.body.dueDate < today && new Prisma.Decimal(p.financials.invoices.find(f => f.id === i.id)?.outstanding ?? "0").gt(0)).length, 0),
    contractGross: sum("contractGross"), invoiceGross: sum("invoiceGross"), received: sum("received"), outstanding: sum("outstanding"), actualCostNet: sum("actualCostNet"),
  };
}
