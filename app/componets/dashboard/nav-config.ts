import {
  FileSignature, Hammer,
  Activity, BookUser, Calculator, Columns2, FileText, Film, FolderKanban, HardHat,
  FolderOpen, Image as ImageIcon, Images, LayoutDashboard, Package, Settings, SlidersHorizontal, Tag, Users, type LucideIcon,
} from "lucide-react";

// Dashboard navigation, shared by the sidebar (client) and the dashboard home page (server).
export type NavLink = { name: string; href: string; icon: LucideIcon; hint?: string };
export type NavSection = { title: string; links: NavLink[] };

// Grouped by what you are doing. Routes are unchanged; only the labels are clearer.
export const navSections: NavSection[] = [
  {
    title: "Overview",
    links: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Operations", href: "/dashboard/operations", icon: Activity, hint: "Quotes, projects and money at a glance" },
    ],
  },
  {
    title: "Pricing & quotes",
    links: [
      { name: "Quote calculator", href: "/dashboard/calculator", icon: Calculator, hint: "Price a job room by room" },
      { name: "Saved quotes", href: "/dashboard/saved-quotes", icon: FolderOpen, hint: "Drafts, sent and accepted quotes, client choices" },
      { name: "Labour & material rates", href: "/dashboard/rates", icon: SlidersHorizontal, hint: "Your standard prices per job and material" },
      { name: "Supplier prices", href: "/dashboard/supplier-prices", icon: Tag, hint: "Daily Selco & Builder Depot prices" },
      { name: "Company & documents", href: "/dashboard/company", icon: FileSignature, hint: "Details on quotes, contracts & H&S documents" },
      { name: "Catalogue quotes", href: "/dashboard/quotes", icon: FileText, hint: "Older catalogue-based quotes" },
      { name: "Price catalogue", href: "/dashboard/items", icon: Package, hint: "Materials, labour and prices" },
    ],
  },
  {
    title: "Clients & projects",
    links: [
      { name: "Jobs", href: "/dashboard/jobs", icon: Hammer, hint: "Progress, photos, client requests, payments, team, orders" },
      { name: "Workers & subcontractors", href: "/dashboard/team", icon: HardHat, hint: "Call, rate, pay and check-in links" },
      { name: "Delivery projects", href: "/dashboard/delivery-projects", icon: HardHat, hint: "Accepted jobs, invoices, photos" },
      { name: "Client portal projects", href: "/dashboard/project-clients", icon: FolderKanban, hint: "Client dashboards and stages" },
      { name: "Estimator clients", href: "/dashboard/clients", icon: Users, hint: "People who used the online estimator" },
      { name: "Contacts & trades", href: "/dashboard/contacts", icon: BookUser, hint: "Suppliers, subcontractors and contacts" },
    ],
  },
  {
    title: "Website",
    links: [
      { name: "Portfolio projects", href: "/dashboard/projects", icon: Images, hint: "Projects shown on the website" },
      { name: "Hero video", href: "/dashboard/hero", icon: Film, hint: "Homepage video" },
      { name: "Banner pictures", href: "/dashboard/banner", icon: ImageIcon, hint: "Homepage banner images" },
      { name: "Before / after", href: "/dashboard/beforeafter", icon: Columns2, hint: "Before & after gallery" },
    ],
  },
  {
    title: "Company",
    links: [{ name: "Company settings", href: "/dashboard/settings", icon: Settings, hint: "Markup, VAT, payment terms, working days" }],
  },
];

