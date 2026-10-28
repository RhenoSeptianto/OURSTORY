import { localDate } from "../lib";
import type { RecordBase, Trip } from "../lib";

export interface SpecialDay extends RecordBase {
  title: string;
  kind: "special" | "anniversary";
  date: string;
}
export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  end: string;
  days: number;
  annual: boolean;
  anniversary: number | null;
  version: number;
  source?: SpecialDay;
  started?: boolean;
}
const dayMs = 86400000;
function stamp(date: string) {
  return Date.parse(date + "T00:00:00Z");
}
export function addDays(date: string, days: number) {
  return new Date(stamp(date) + days * dayMs).toISOString().slice(0, 10);
}
export function nextAnnual(date: string, today: string) {
  const occurrence = (year: number) => {
    const month = Number(date.slice(5, 7));
    const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return `${year}-${date.slice(5, 7)}-${String(Math.min(Number(date.slice(8)), last)).padStart(2, "0")}`;
  };
  const year = Math.max(Number(today.slice(0, 4)), Number(date.slice(0, 4)));
  const current = occurrence(year);
  return current >= today ? current : occurrence(year + 1);
}
export function upcoming(
  specials: SpecialDay[],
  trips: Trip[],
  today = localDate(),
  now = new Date(),
): CalendarEvent[] {
  const events: CalendarEvent[] = specials
    .filter((s) => !s.deleted_at)
    .map((s) => {
      const date = nextAnnual(s.date, today);
      return {
        id: `special-${s.id}`,
        title: s.title,
        date,
        end: date,
        days: Math.round((stamp(date) - stamp(today)) / dayMs),
        annual: true,
        anniversary:
          s.kind === "anniversary"
            ? Number(date.slice(0, 4)) - Number(s.date.slice(0, 4))
            : null,
        version: s.version,
        source: s,
      };
    });
  for (const t of trips) {
    const tripToday = localDate(t.timezone, now);
    if (!t.deleted_at && !t.archived && t.end_date >= tripToday)
      events.push({
        id: `trip-${t.id}`,
        title: t.name,
        date: t.start_date,
        end: t.end_date,
        days: Math.max(
          0,
          Math.round((stamp(t.start_date) - stamp(tripToday)) / dayMs),
        ),
        annual: false,
        started: t.start_date < tripToday,
        anniversary: null,
        version: t.version,
      });
  }
  return events.sort(
    (a, b) => a.days - b.days || a.title.localeCompare(b.title),
  );
}
function escapeText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}
// RFC 5545 lines are folded at 75 UTF-8 octets, never in the middle of a character.
function fold(line: string) {
  let result = "",
    part = "",
    bytes = 0;
  for (const char of line) {
    const count = new TextEncoder().encode(char).length;
    if (bytes + count > 75) {
      result += part + "\r\n";
      part = " ";
      bytes = 1;
    }
    part += char;
    bytes += count;
  }
  return result + part;
}
export function calendarFile(event: CalendarEvent, now = new Date()) {
  const compact = (date: string) => date.replace(/-/g, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ourstory//Reminders//ID",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${event.id}@ourstory.local`,
    `SEQUENCE:${event.version}`,
    `DTSTAMP:${now
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "")}`,
    `DTSTART;VALUE=DATE:${compact(event.date)}`,
    `DTEND;VALUE=DATE:${compact(addDays(event.end, 1))}`,
    `SUMMARY:${escapeText(event.title)}`,
    `DESCRIPTION:${escapeText("Pengingat Ourstory. Jika tanggal berubah atau acara dihapus, perbarui juga kalender HP.")}`,
    "TRANSP:TRANSPARENT",
  ];
  if (event.annual) {
    const original = event.source!.date;
    lines.push(
      original.slice(5) === "02-29"
        ? "RRULE:FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=-1"
        : "RRULE:FREQ=YEARLY",
    );
  }
  // All-day event alarms are relative to midnight: these offsets give 09:00 local time.
  for (const trigger of ["-P6DT15H", event.annual ? "PT9H" : "-PT15H"])
    lines.push(
      "BEGIN:VALARM",
      `TRIGGER:${trigger}`,
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeText(event.title)}`,
      "END:VALARM",
    );
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
export function googleCalendar(event: CalendarEvent) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${event.date.replace(/-/g, "")}/${addDays(event.end, 1).replace(/-/g, "")}`,
    details:
      "Dari Ourstory. Atur pengingat di kalender; perubahan di Ourstory perlu diperbarui manual.",
  });
  if (event.annual)
    params.set(
      "recur",
      event.source?.date.slice(5) === "02-29"
        ? "RRULE:FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=-1"
        : "RRULE:FREQ=YEARLY",
    );
  return `https://calendar.google.com/calendar/render?${params}`;
}
