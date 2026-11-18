// A tiny iCalendar (.ics) writer – enough for all-day events that Google, Outlook and Apple calendars accept.
export interface CalEvent { uid: string; title: string; start: string; end?: string; description?: string; location?: string; url?: string; category?: string }

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\;");
const day = (d: string) => d.replace(/-/g, "");
const nextDay = (d: string) => { const x = new Date(`${d}T00:00:00Z`); x.setUTCDate(x.getUTCDate() + 1); return x.toISOString().slice(0, 10); };
/** Lines longer than 75 bytes are folded (continuation lines start with a space), as the standard requires. */
function fold(line: string) {
  const out: string[] = []; let cur = "", bytes = 0;
  for (const ch of line) {
    const b = Buffer.byteLength(ch);
    if (bytes + b > (out.length ? 74 : 75)) { out.push(cur); cur = ""; bytes = 0; }
    cur += ch; bytes += b;
  }
  out.push(cur);
  return out.join("\r\n ");
}

export function toIcs(name: string, events: CalEvent[], now = new Date()) {
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//2A Construction//Jobs calendar//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(name)}`, "X-WR-TIMEZONE:Europe/London", "REFRESH-INTERVAL;VALUE=DURATION:PT2H", "X-PUBLISHED-TTL:PT2H"];
  for (const e of events) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.start)) continue;
    const end = e.end && e.end >= e.start ? e.end : e.start;
    lines.push("BEGIN:VEVENT", `UID:${esc(e.uid)}`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${day(e.start)}`, `DTEND;VALUE=DATE:${day(nextDay(end))}`,
      `SUMMARY:${esc(e.title)}`, ...(e.description ? [`DESCRIPTION:${esc(e.description)}`] : []), ...(e.location ? [`LOCATION:${esc(e.location)}`] : []),
      ...(e.url ? [`URL:${e.url}`] : []), ...(e.category ? [`CATEGORIES:${esc(e.category)}`] : []), "TRANSP:TRANSPARENT", "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
