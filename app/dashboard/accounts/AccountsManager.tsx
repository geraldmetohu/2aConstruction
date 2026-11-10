"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Search, UserPlus } from "lucide-react";
import { inviteAccount, sendPasswordLink, setAccountDisabled, updateAccountRole } from "./actions";

type Row = { id: string; email: string; name: string; phone: string; role: string; trade: string | null; admin: boolean; verified: boolean; password: boolean; google: boolean; disabled: boolean; lastLoginAt: string | null; createdAt: string };
const ROLE_LABEL: Record<string, string> = { CLIENT: "Client", TRADE: "Trade", STAFF: "Staff / PM", ADMIN: "Admin" };
const field = "rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm";
const when = (d: string | null) => d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" }) : "never";

export function AccountsManager({ ready, q, google, mail, trades, accounts }: { ready: boolean; q: string; google: boolean; mail: boolean; trades: [string, string][]; accounts: Row[] }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [inv, setInv] = useState({ email: "", name: "", role: "TRADE", trade: trades[0]?.[0] ?? "" });
  const [busy, setBusy] = useState(false);
  const done = (r: { ok: boolean; message?: string }) => { setMsg({ ok: r.ok, text: r.message ?? (r.ok ? "Saved." : "Could not save.") }); router.refresh(); };
  async function invite() {
    setBusy(true);
    done(await inviteAccount({ ...inv, trade: inv.role === "TRADE" ? inv.trade : null }));
    setBusy(false);
    setInv(i => ({ ...i, email: "", name: "" }));
  }
  return (
    <div className="space-y-5">
      <header className="rounded-2xl border bg-white p-4">
        <h1 className="text-xl font-black">Accounts</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-600">Everyone who signs in: clients, trades and staff. Admins are the emails in <code>ADMIN_EMAILS</code>. Clients create their own accounts with the email their quote went to; invite trades and staff here – they get an email to choose a password.</p>
        {!ready && <p className="mt-2 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-900">Apply migration <code>20261111120000_add_accounts</code> to switch on our own sign-in.</p>}
        {ready && !mail && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">Email isn't set up (SMTP settings) – people can't confirm their email or reset passwords until it is.</p>}
        {ready && !google && <p className="mt-2 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-900">“Continue with Google” is off: add <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code>.</p>}
        {msg && <p className={`mt-2 rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-800"}`}>{msg.text}</p>}
      </header>

      <section className="rounded-2xl border bg-white p-4">
        <h2 className="flex items-center gap-2 font-bold"><UserPlus className="h-4 w-4 text-amber-600" />Invite someone</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-[2fr_1.5fr_1fr_1.5fr_auto]">
          <input className={field} type="email" placeholder="email@example.com" value={inv.email} onChange={e => setInv({ ...inv, email: e.target.value })} />
          <input className={field} placeholder="Name" value={inv.name} onChange={e => setInv({ ...inv, name: e.target.value })} />
          <select className={field} value={inv.role} onChange={e => setInv({ ...inv, role: e.target.value })}><option value="TRADE">Trade</option><option value="STAFF">Staff / PM</option><option value="CLIENT">Client</option></select>
          <select className={field} disabled={inv.role !== "TRADE"} value={inv.trade} onChange={e => setInv({ ...inv, trade: e.target.value })}>{trades.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          <button disabled={!ready || busy || !inv.email} onClick={invite} className="rounded-lg bg-neutral-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{busy ? "Sending…" : "Send invite"}</button>
        </div>
      </section>

      <form className="flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-sm sm:w-80"><Search className="h-4 w-4 text-neutral-400" /><input name="q" defaultValue={q} placeholder="Search name or email" className="flex-1 outline-none" /></form>

      <div className="overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-neutral-50 text-left text-xs text-neutral-500"><tr><th className="px-4 py-2">Person</th><th className="px-2">Role</th><th className="px-2">Sign-in</th><th className="px-2">Last sign-in</th><th className="px-4 text-right">Actions</th></tr></thead>
          <tbody>{accounts.map(a => (
            <tr key={a.id} className={`border-t align-top ${a.disabled ? "opacity-50" : ""}`}>
              <td className="px-4 py-2.5"><p className="font-semibold">{a.name || "—"}</p><p className="text-xs text-neutral-500">{a.email}{a.phone ? ` · ${a.phone}` : ""}</p></td>
              <td className="px-2 py-2.5">
                {a.admin ? <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">Admin</span> : (
                  <div className="flex flex-wrap gap-1">
                    <select className="rounded border px-1.5 py-1 text-xs" value={a.role} onChange={async e => done(await updateAccountRole(a.id, { role: e.target.value, trade: e.target.value === "TRADE" ? a.trade ?? trades[0][0] : null }))}>
                      {["CLIENT", "TRADE", "STAFF"].map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select>
                    {a.role === "TRADE" && <select className="rounded border px-1.5 py-1 text-xs" value={a.trade ?? ""} onChange={async e => done(await updateAccountRole(a.id, { role: "TRADE", trade: e.target.value }))}>{trades.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>}
                  </div>)}
              </td>
              <td className="px-2 py-2.5 text-xs">
                {[a.password && "Password", a.google && "Google", !a.verified && "Not confirmed"].filter(Boolean).join(" · ") || "Email link"}
              </td>
              <td className="px-2 py-2.5 text-xs text-neutral-600">{when(a.lastLoginAt)}<span className="block text-neutral-400">joined {when(a.createdAt)}</span></td>
              <td className="px-4 py-2.5 text-right">
                <div className="flex flex-wrap justify-end gap-2 text-xs">
                  <button onClick={async () => done(await sendPasswordLink(a.id))} className="inline-flex items-center gap-1 rounded border px-2 py-1 hover:border-neutral-500"><KeyRound className="h-3 w-3" />Password link</button>
                  {!a.admin && <button onClick={async () => { if (a.disabled || confirm(`Switch off ${a.email}? They are signed out and can't sign in until you switch them back on.`)) done(await setAccountDisabled(a.id, !a.disabled)); }} className="rounded border px-2 py-1 hover:border-neutral-500">{a.disabled ? "Switch on" : "Switch off"}</button>}
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
        {!accounts.length && <p className="p-6 text-center text-sm text-neutral-500">No accounts yet.</p>}
      </div>
    </div>
  );
}
