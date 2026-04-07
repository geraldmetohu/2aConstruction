"use client";

export function ReviewsWidgets() {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">
              Independent reviews
            </p>
            <h3 className="text-2xl md:text-4xl font-extrabold tracking-tight text-neutral-900">
              Trusted by homeowners across London
            </h3>
            <p className="mt-3 max-w-2xl text-neutral-600">
              Verified ratings and customer feedback from independent review platforms.
            </p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* TopRatedBuilders */}
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 flex justify-center">
            <iframe
              src="https://topratedbuilders.co.uk/badge/2a-construction-ltd-london/?style=detailed"
              width="280"
              height="240"
              frameBorder="0"
              scrolling="no"
              style={{ border: "none", overflow: "hidden", borderRadius: "14px" }}
              title="Top Rated Builders badge for 2A Construction Ltd"
              loading="lazy"
            />
          </div>

          {/* Checkatrade fallback */}
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6 min-h-[240px] flex flex-col justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.15em] text-amber-700">
                Checkatrade
              </p>
              <h4 className="mt-2 text-2xl md:text-3xl font-extrabold text-neutral-900">
                View our Checkatrade profile
              </h4>
              <p className="mt-3 text-neutral-600">
                See our public Checkatrade page, rating, and latest verified customer review.
              </p>
            </div>

            <a
              href="https://www.checkatrade.com/trades/2aconstructionltd"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex w-fit items-center justify-center rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Visit Checkatrade
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}