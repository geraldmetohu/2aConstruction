"use client";
export default function DeliveryError({ reset }: { reset: () => void }) { return <div className="space-y-4 p-8"><h1 className="text-2xl font-bold">Unable to load project conversion</h1><p>Check access and configuration, then try again. Saved quotes and project baselines remain unchanged.</p><button className="rounded-lg border px-4 py-2" onClick={reset}>Try again</button></div>; }
