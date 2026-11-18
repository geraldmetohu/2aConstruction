import type { Metadata } from "next";
import { UnsubscribeForm } from "./UnsubscribeForm";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false, follow: false } };

export default function UnsubscribePage() {
  return (
    <main id="main" className="mx-auto max-w-lg px-4 py-16">
      <h1 className="text-3xl font-black text-[#071a33]">Unsubscribe from marketing emails</h1>
      <p className="mt-3 text-neutral-600">Enter your email and we&apos;ll stop sending you news and offers. The unsubscribe link in any of our marketing emails works too – one click.</p>
      <UnsubscribeForm />
    </main>
  );
}
