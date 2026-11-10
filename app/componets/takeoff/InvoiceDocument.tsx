"use client";
import { Printer } from "lucide-react";
import { longDate, type QuoteDocs } from "@/app/lib/takeoff/documents";
import { Page, SectionTitle } from "./DocParts";

export interface InvoiceView { number: string; label: string; description: string; issuedOn: string; dueOn: string; net: number; vat: number; gross: number }
const gbp = (x: number) => `£${x.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * One stage invoice, printable on its own. A VAT invoice when the company has a VAT number.
 * `account` is the running position on the contract: what has been invoiced and paid so far.
 */
export function InvoiceDocument({ d, inv, account, status }: {
  d: QuoteDocs; inv: InvoiceView; status: { paid: number; balance: number };
  account: { contract: number; invoiced: { number: string; label: string; issuedOn: string; gross: number }[]; paidToDate: number };
}) {
  const c = d.company, vatInvoice = !!c.vatNo;
  const before = account.invoiced.filter(i => i.number !== inv.number && i.issuedOn <= inv.issuedOn);
  const paidOff = status.balance <= 0.005;
  const print = () => { const old = document.title; document.title = `Invoice ${inv.number}`; window.print(); setTimeout(() => { document.title = old; }, 500); };
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3 print:hidden">
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${paidOff ? "bg-emerald-100 text-emerald-800" : status.paid > 0 ? "bg-sky-100 text-sky-800" : "bg-amber-100 text-amber-900"}`}>{paidOff ? "Paid – thank you" : status.paid > 0 ? `Part paid · ${gbp(status.balance)} left` : `Due by ${longDate(inv.dueOn)}`}</span>
        <button onClick={print} className="ml-auto inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-neutral-950"><Printer className="h-4 w-4" />Print / save as PDF</button>
      </div>
      <div className="doc-print">
        <Page d={d} title={vatInvoice ? "Tax invoice" : "Invoice"} subtitle={d.client.siteAddress ? `Site: ${d.client.siteAddress.replace(/\n/g, ", ")}` : undefined}
          meta={[["Invoice no.", inv.number], ["Invoice date", longDate(inv.issuedOn)], ["Due by", longDate(inv.dueOn)], ["Our reference", d.reference], ...(vatInvoice ? [["VAT no.", c.vatNo] as [string, string]] : [])]}>
          <div className="grid gap-4 sm:grid-cols-2 print:grid-cols-2">
            <div className="rounded-lg border border-neutral-200 p-4"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Invoice to</p><p className="mt-1 font-semibold text-[#071a33]">{d.client.name}</p>
              {d.client.address && <p className="whitespace-pre-line text-neutral-700">{d.client.address}</p>}{d.client.email && <p className="text-neutral-600">{d.client.email}</p>}</div>
            <div className={`rounded-lg p-4 ${paidOff ? "bg-emerald-50" : "bg-[#071a33] text-white"}`}><p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${paidOff ? "text-emerald-700" : "text-[#f5b400]"}`}>{paidOff ? "Paid" : "Amount due"}</p>
              <p className="mt-1 text-3xl font-black tabular-nums">{gbp(paidOff ? inv.gross : status.balance)}</p><p className={`text-xs ${paidOff ? "text-emerald-800" : "text-white/70"}`}>{paidOff ? "Thank you for your payment." : `by ${longDate(inv.dueOn)}`}</p></div>
          </div>

          <div><SectionTitle>Details</SectionTitle>
            <table className="mt-2 w-full text-sm"><thead><tr className="border-b border-neutral-300 text-left text-[10px] uppercase tracking-wide text-neutral-500"><th className="py-1.5">Description</th><th className="text-right">Amount</th></tr></thead>
              <tbody><tr className="border-b border-neutral-100 align-top"><td className="py-2 pr-4"><p className="font-semibold text-[#071a33]">{inv.label}</p><p className="text-xs text-neutral-600">{inv.description}</p><p className="mt-0.5 text-xs text-neutral-500">{d.title} – contract {d.reference}</p></td><td className="py-2 text-right tabular-nums">{gbp(inv.net)}</td></tr></tbody></table>
            <table className="ml-auto mt-3 w-full max-w-xs text-sm"><tbody>
              <tr><td className="py-0.5">Net</td><td className="text-right tabular-nums">{gbp(inv.net)}</td></tr>
              <tr><td className="py-0.5">VAT{inv.net > 0 ? ` (${Math.round(inv.vat / inv.net * 1000) / 10}%)` : ""}</td><td className="text-right tabular-nums">{gbp(inv.vat)}</td></tr>
              <tr className="border-t-2 border-[#071a33] text-base"><td className="pt-1.5 font-black">Total</td><td className="pt-1.5 text-right font-black tabular-nums">{gbp(inv.gross)}</td></tr>
            </tbody></table>
          </div>

          <div className="break-inside-avoid"><SectionTitle>Your account</SectionTitle>
            <table className="mt-2 w-full text-xs"><tbody>
              <tr className="border-b border-neutral-100"><td className="py-1.5">Contract sum including VAT and approved variations</td><td className="text-right tabular-nums">{gbp(account.contract)}</td></tr>
              {before.map(i => <tr key={i.number} className="border-b border-neutral-100 text-neutral-600"><td className="py-1.5">{i.number} · {i.label} ({longDate(i.issuedOn)})</td><td className="text-right tabular-nums">{gbp(i.gross)}</td></tr>)}
              <tr className="border-b border-neutral-100 font-semibold"><td className="py-1.5">This invoice – {inv.number}</td><td className="text-right tabular-nums">{gbp(inv.gross)}</td></tr>
              <tr className="border-b border-neutral-100"><td className="py-1.5">Paid to date (all invoices)</td><td className="text-right tabular-nums">{gbp(account.paidToDate)}</td></tr>
              <tr><td className="py-1.5">Left to invoice after this one</td><td className="text-right tabular-nums">{gbp(Math.max(0, account.contract - before.reduce((s, i) => s + i.gross, 0) - inv.gross))}</td></tr>
            </tbody></table>
          </div>

          {!paidOff && <div className="break-inside-avoid rounded-lg border-2 border-[#071a33] p-4"><p className="font-bold text-[#071a33]">How to pay</p>
            {c.accountNumber ? <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-6 gap-y-0.5 text-sm"><dt className="text-neutral-500">Account name</dt><dd className="font-semibold">{c.accountName || c.registeredName}</dd>
              {c.bankName && <><dt className="text-neutral-500">Bank</dt><dd className="font-semibold">{c.bankName}</dd></>}<dt className="text-neutral-500">Sort code</dt><dd className="font-semibold">{c.sortCode}</dd>
              <dt className="text-neutral-500">Account number</dt><dd className="font-semibold">{c.accountNumber}</dd><dt className="text-neutral-500">Payment reference</dt><dd className="font-semibold">{inv.number}</dd></dl>
              : <p className="mt-1 text-sm">Please call us on {c.phone} for our bank details.</p>}
            <p className="mt-2 text-xs text-neutral-600">Payable within the terms of your contract by bank transfer. We will never ask you to change our bank details by email – if in doubt, call {c.phone} before paying. Once paid, tell us in your client area and we'll confirm when it arrives.</p></div>}
        </Page>
      </div>
      <style>{`@media print { @page { size: A4; margin: 14mm; } body * { visibility: hidden !important; } .doc-print, .doc-print * { visibility: visible !important; } .doc-print { position: absolute; left: 0; top: 0; width: 100%; } .doc-print .doc-page { break-before: auto; } }`}</style>
    </div>
  );
}
