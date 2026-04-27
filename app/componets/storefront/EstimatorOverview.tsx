import Link from "next/link";
import { ArrowRight, Calculator, FileStack, House, Upload } from "lucide-react";

export function EstimatorOverview() {
  return (
    <section className="bg-[linear-gradient(135deg,#fff8e8_0%,#ffffff_48%,#f4f7fb_100%)] py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid gap-8 overflow-hidden rounded-[2rem] border border-amber-200 bg-white p-6 shadow-[0_24px_80px_rgba(0,0,0,0.08)] md:grid-cols-[1.1fr_0.9fr] md:p-10">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-amber-700">Estimator</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-neutral-950 md:text-5xl">
              Send your brief before the site visit.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-neutral-600 md:text-lg">
              Clients can choose one job or combine lofts, extensions, refurbishments, roofing and more in a single estimator form. Upload photos, plans and PDFs, set your budget range, and tell us how you want the project to run.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/estimator"
                className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-5 py-3 text-sm font-black text-white transition hover:bg-amber-500 hover:text-black"
              >
                Start the estimator
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/portfolio/all"
                className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-5 py-3 text-sm font-black text-neutral-800 transition hover:border-amber-400 hover:text-amber-700"
              >
                See completed projects
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                title: "Multi-job briefs",
                text: "Extension, loft and refurbishment together if needed.",
                Icon: House,
              },
              {
                title: "Uploads included",
                text: "Photos, ideas, plans and PDFs all in one place.",
                Icon: Upload,
              },
              {
                title: "Budget first",
                text: "Structured ranges help us shape a realistic quote.",
                Icon: Calculator,
              },
              {
                title: "Detailed enough",
                text: "Simple for most clients, with optional advanced extras.",
                Icon: FileStack,
              },
            ].map(({ title, text, Icon }) => (
              <div key={title} className="rounded-3xl border border-neutral-200 bg-neutral-50 p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-black text-neutral-900">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-neutral-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
