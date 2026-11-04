"use client";
import { Bar, CartesianGrid, Legend, Line, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const fmt = (x: number) => `£${Math.round(x).toLocaleString("en-GB")}`;
const month = (m: string) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });

/** Money in vs out per month with profit as a line. */
export function FinanceChart({ data }: { data: { month: string; moneyIn: number; moneyOut: number; profit: number }[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <ComposedChart data={data.map(d => ({ ...d, label: month(d.month) }))} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={(v: number) => `£${Math.round(v / 1000)}k`} tick={{ fontSize: 12 }} width={48} />
          <Tooltip formatter={(v: unknown) => fmt(Number(v))} />
          <Legend />
          <Bar dataKey="moneyIn" name="Money in" fill="#16a34a" radius={[4, 4, 0, 0]} />
          <Bar dataKey="moneyOut" name="Money out" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          <Line dataKey="profit" name="Profit (ex VAT)" stroke="#0a0a0a" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
