"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { ArrowRight, Check, Eye, EyeOff, LogOut, Monitor, Smartphone } from "lucide-react";
import { changePassword, saveProfile, signOutOtherDevices, type AccountState } from "./actions";
import { SignOutButton } from "@/app/componets/auth/AuthLinks";

const input = "block w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-[15px] text-[#071a33] outline-none focus:border-[#071a33] focus:ring-4 focus:ring-[#f5b400]/30";
const card = "rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm";
const btn = "inline-flex items-center justify-center gap-2 rounded-xl bg-[#071a33] px-5 py-3 text-sm font-bold text-white hover:bg-[#0d2a4f] disabled:opacity-50";
const Msg = ({ s }: { s: AccountState }) => s.message ? <p role="status" className={`rounded-xl px-4 py-2.5 text-sm ${s.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-800"}`}>{s.message}</p> : null;
const device = (ua: string) => /iPhone|iPad/.test(ua) ? "iPhone / iPad" : /Android/.test(ua) ? "Android" : /Mac OS/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows PC" : "Device";
const browser = (ua: string) => /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /Firefox\//.test(ua) ? "Firefox" : "";

export function AccountForms({ home, name, phone, email, hasPassword, google, googleAvailable, googleLinked, rules, sessions }: {
  home: string; name: string; phone: string; email: string; hasPassword: boolean; google: boolean; googleAvailable: boolean; googleLinked: boolean; rules: string;
  sessions: { id: string; createdAt: string; lastSeenAt: string; userAgent: string; ip: string; method: string; current: boolean }[];
}) {
  const [p, profileAction] = useActionState(saveProfile, {});
  const [pw, passwordAction] = useActionState(changePassword, {});
  const [o, othersAction] = useActionState(signOutOtherDevices, {});
  const [show, setShow] = useState(false);
  return (
    <div className="mt-8 space-y-6">
      <Link href={home} className="inline-flex items-center gap-2 rounded-xl bg-[#f5b400] px-5 py-3 text-sm font-bold text-[#071a33]">Go to my area <ArrowRight className="h-4 w-4" /></Link>

      <section className={card}>
        <h2 className="text-lg font-semibold text-[#071a33]">Your details</h2>
        <form action={profileAction} className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-[#071a33]">Full name<input name="name" autoComplete="name" defaultValue={name} className={`mt-1.5 ${input}`} />{p.errors?.name && <span className="mt-1 block text-sm font-normal text-red-700">{p.errors.name}</span>}</label>
          <label className="block text-sm font-semibold text-[#071a33]">Mobile<input name="phone" type="tel" autoComplete="tel" defaultValue={phone} className={`mt-1.5 ${input}`} />{p.errors?.phone && <span className="mt-1 block text-sm font-normal text-red-700">{p.errors.phone}</span>}</label>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2"><button className={btn}>Save</button><Msg s={p} /></div>
        </form>
      </section>

      <section id="password" className={card}>
        <h2 className="text-lg font-semibold text-[#071a33]">{hasPassword ? "Change password" : "Set a password"}</h2>
        <p className="mt-1 text-sm text-neutral-600">{hasPassword ? "Changing it signs you out on your other devices." : "You sign in with Google or email links. Add a password if you'd like to sign in with it too."}</p>
        <form action={passwordAction} className="mt-4 space-y-4">
          <input type="email" name="email" autoComplete="username" value={email} readOnly className="sr-only" tabIndex={-1} aria-hidden />
          {hasPassword && <label className="block text-sm font-semibold text-[#071a33]">Current password<input name="current" type={show ? "text" : "password"} autoComplete="current-password" required className={`mt-1.5 ${input}`} />{pw.errors?.current && <span className="mt-1 block text-sm font-normal text-red-700">{pw.errors.current}</span>}</label>}
          <label className="block text-sm font-semibold text-[#071a33]">New password
            <span className="relative mt-1.5 block">
              <input name="password" type={show ? "text" : "password"} autoComplete="new-password" {...{ passwordrules: rules }} required minLength={10} className={`${input} pr-12`} />
              <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? "Hide passwords" : "Show passwords"} className="absolute inset-y-0 right-0 grid w-12 place-items-center text-neutral-500">{show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>
            </span>
            {pw.errors?.password ? <span className="mt-1 block text-sm font-normal text-red-700">{pw.errors.password}</span> : <span className="mt-1 block text-xs font-normal text-neutral-500">At least 10 characters. Let your phone or browser suggest one and save it.</span>}
          </label>
          <div className="flex flex-wrap items-center gap-3"><button className={btn}>{hasPassword ? "Change password" : "Set password"}</button><Msg s={pw} /></div>
        </form>
      </section>

      <section className={card}>
        <h2 className="text-lg font-semibold text-[#071a33]">Google</h2>
        {googleLinked && <p className="mt-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-900">Google is now connected.</p>}
        {google ? <p className="mt-2 flex items-center gap-2 text-sm text-emerald-800"><Check className="h-4 w-4" />Connected – you can use “Continue with Google”.</p>
          : googleAvailable ? <a href="/api/auth/google?next=/account" className="mt-3 inline-flex items-center gap-2 rounded-xl border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-[#071a33] hover:border-[#071a33]">Connect Google</a>
          : <p className="mt-2 text-sm text-neutral-500">Not available yet.</p>}
      </section>

      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-[#071a33]">Where you're signed in</h2>
          {sessions.length > 1 && <form action={othersAction}><button className="text-sm font-semibold text-[#071a33] underline-offset-4 hover:underline">Sign out other devices</button></form>}
        </div>
        <Msg s={o} />
        <ul className="mt-3 divide-y">
          {sessions.map(s => (
            <li key={s.id} className="flex items-center gap-3 py-3 text-sm">
              {/iPhone|Android/.test(s.userAgent) ? <Smartphone className="h-5 w-5 text-neutral-400" /> : <Monitor className="h-5 w-5 text-neutral-400" />}
              <span className="flex-1"><span className="font-semibold text-[#071a33]">{device(s.userAgent)}{browser(s.userAgent) ? ` · ${browser(s.userAgent)}` : ""}</span>{s.current && <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">this device</span>}
                <span className="block text-xs text-neutral-500">Last active {new Date(s.lastSeenAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · signed in with {s.method.toLowerCase().replace("_", " ")}</span></span>
            </li>
          ))}
        </ul>
        <SignOutButton className="mt-3 inline-flex items-center gap-2 rounded-xl border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-[#071a33] hover:border-[#071a33]"><LogOut className="h-4 w-4" />Sign out</SignOutButton>
      </section>
    </div>
  );
}
