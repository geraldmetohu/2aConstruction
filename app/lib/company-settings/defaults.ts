import { z } from "zod";
export const planningDefaultsSchema = z.object({
  versionId: z.string().uuid(), quoteValidityDays: z.number().int().min(1).max(365), invoiceTermsDays: z.number().int().min(0).max(365),
  workdayHours: z.number().positive().max(24), defaultTeamSize: z.number().int().min(1).max(100),
  workingDays: z.array(z.number().int().min(1).max(7)).min(1).max(7).refine(v => new Set(v).size === v.length),
});
export type PlanningDefaults = z.infer<typeof planningDefaultsSchema>;
export function calendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Enter a real calendar date.");
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error("Enter a real calendar date.");
  return date;
}
export function addCalendarDays(value: string, days: number) {
  if (!Number.isInteger(days) || days < 0 || days > 36500) throw new Error("Invalid number of days.");
  const date = calendarDate(value); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10);
}
export function londonDate(now = new Date()) { return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(now); }
export function planWorkingDates(start: string, personHours: number, raw: PlanningDefaults) {
  const defaults = planningDefaultsSchema.parse(raw);
  if (!Number.isFinite(personHours) || personHours <= 0 || personHours > 1000000) throw new Error("Enter positive estimated person-hours.");
  const days = Math.ceil(personHours / (defaults.workdayHours * defaults.defaultTeamSize));
  if (days > 36500) throw new Error("This duration needs a manual programme.");
  const date = calendarDate(start); let first = "", remaining = days;
  while (remaining > 0) {
    if (defaults.workingDays.includes(date.getUTCDay() || 7)) { first ||= date.toISOString().slice(0, 10); remaining--; }
    if (remaining) date.setUTCDate(date.getUTCDate() + 1);
  }
  return { start: first, end: date.toISOString().slice(0, 10), workingDays: days };
}
