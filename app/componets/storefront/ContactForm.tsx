"use client";

import { sendContact } from "@/app/actions";
import { useActionState } from "react";

export function ContactForm() {
  const [state, formAction] = useActionState(sendContact, { ok: false, message: "" });

  return (
    <form action={formAction} className="space-y-5">
      {/* Honeypot (hidden) */}
      <input type="text" name="company" className="hidden" tabIndex={-1} autoComplete="off" />

      <div className="grid md:grid-cols-2 gap-5">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Name</label>
          <input name="name" required placeholder="Your full name" className="w-full border px-3 py-2" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Email</label>
          <input type="email" name="email" required placeholder="you@example.com" className="w-full border px-3 py-2" />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Phone (optional)</label>
        <input name="phone" placeholder="+44 ..." className="w-full border px-3 py-2" />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Message</label>
        <textarea name="message" required placeholder="Tell us about your project…" className="w-full border px-3 py-3 min-h-[120px]" />
      </div>

      <div className="pt-2 flex items-center gap-3">
        <button type="submit" className="px-5 py-3 bg-primary text-white font-medium hover:opacity-90">
          Send Message
        </button>
        {state?.message && (
          <span className={`text-sm ${state.ok ? "text-green-700" : "text-red-600"}`}>
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}
