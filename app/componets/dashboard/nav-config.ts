import {
  FileSignature, Hammer, Bell, Bug, Database, Download, Megaphone, Star,
  Activity, BookUser, Calculator, Columns2, FileText, Film, FolderKanban, HardHat,
  FolderOpen, Image as ImageIcon, Images, LayoutDashboard, Package, PoundSterling, Settings, ShieldCheck, SlidersHorizontal, Tag, Users, type LucideIcon,
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
      { name: "Finance", href: "/dashboard/finance", icon: PoundSterling, hint: "Job & company costs, bank, cash, CIS, VAT, year end" },
    ],
  },
  {
    title: "Pricing & quotes",
    links: [
      { name: "Quote calculator", href: "/dashboard/calculator", icon: Calculator, hint: "Price a job room by room" },
      { name: "Saved quotes", href: "/dashboard/saved-quotes", icon: FolderOpen, hint: "Drafts, sent and accepted quotes, client choices" },
      { name: "Labour & material rates", href: "/dashboard/rates", icon: SlidersHorizontal, hint: "Your standard prices per job and material" },
      { name: "Supplier prices", href: "/dashboard/supplier-prices", icon: Tag, hint: "Monthly merchant prices, price lists" },
      { name: "Company & documents", href: "/dashboard/company", icon: FileSignature, hint: "Details on quotes, contracts & H&S documents" },
      { name: "ISO & tender documents", href: "/dashboard/compliance", icon: ShieldCheck, hint: "ISO 9001 / 14001 / 45001 system, policies, tender pack" },
      { name: "Client portal demo", href: "/dashboard/demo", icon: Film, hint: "Show a client their portal, step by step, then reset" },
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
    title: "Marketing & tools",
    links: [
      { name: "Marketing emails", href: "/dashboard/marketing", icon: Megaphone, hint: "Ready-made emails to people who agreed, sent through Resend" },
      { name: "Client reviews", href: "/dashboard/reviews", icon: Star, hint: "Approve reviews from the client portal for the website" },
      { name: "Emails & notifications", href: "/dashboard/notifications", icon: Bell, hint: "Morning list, portal digest, reminders, team calendar" },
      { name: "Accounting export", href: "/dashboard/accounting-export", icon: Download, hint: "Xero / QuickBooks / accountant CSV files" },
      { name: "Database backup", href: "/dashboard/backup", icon: Database, hint: "Download everything now, or weekly to the office PC" },
      { name: "Website errors", href: "/dashboard/errors", icon: Bug, hint: "Anything that broke, with alerts by email" },
    ],
  },
  {
    title: "Company",
    links: [
      { name: "Company settings", href: "/dashboard/settings", icon: Settings, hint: "Markup, VAT, payment terms, working days" },
      { name: "Accounts & sign-in", href: "/dashboard/accounts", icon: Users, hint: "Clients, trades and staff who can sign in" },
    ],
  },
];

