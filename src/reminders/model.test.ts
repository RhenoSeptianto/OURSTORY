import { describe, expect, it } from "vitest";
import { calendarFile, googleCalendar, nextAnnual, upcoming } from "./model";
import type { SpecialDay } from "./model";
import type { Trip } from "../lib";
const base = { id: "test", version: 2, created_by: null, updated_by: null };
const special: SpecialDay = {
  ...base,
  title: "Kita ♡",
  kind: "anniversary",
  date: "2022-10-28",
};
const trip: Trip = {
  ...base,
  name: "Bogor",
  city: "Bogor",
  start_date: "2026-10-30",
  end_date: "2026-11-01",
  timezone: "Asia/Jakarta",
  archived: false,
  cover_path: null,
};
describe("Annual dates and calendar export", () => {
  it("keeps today, rolls past dates, respects future start years and leap days", () => {
    expect(nextAnnual(special.date, "2026-10-28")).toBe("2026-10-28");
    expect(nextAnnual(special.date, "2026-10-29")).toBe("2027-10-28");
    expect(nextAnnual("2028-01-01", "2026-10-28")).toBe("2028-01-01");
    expect(nextAnnual("2024-02-29", "2027-01-01")).toBe("2027-02-28");
    expect(nextAnnual("2024-02-29", "2028-01-01")).toBe("2028-02-29");
  });
  it("counts anniversaries and excludes deleted/archived/completed records", () => {
    const list = upcoming(
      [special, { ...special, deleted_at: "now" }],
      [
        trip,
        { ...trip, archived: true },
        { ...trip, deleted_at: "now" },
        { ...trip, start_date: "2025-01-01", end_date: "2025-01-02" },
      ],
      "2026-10-28",
      new Date("2026-10-28T03:00:00Z"),
    );
    expect(list).toHaveLength(2);
    expect(list[0]).toMatchObject({ days: 0, anniversary: 4 });
    expect(list[1]).toMatchObject({ days: 2, annual: false });
  });
  it("uses the trip timezone across midnight", () => {
    const list = upcoming(
      [],
      [{ ...trip, start_date: "2026-10-29", end_date: "2026-10-29" }],
      "2026-10-28",
      new Date("2026-10-28T18:00:00Z"),
    );
    expect(list[0].days).toBe(0);
  });
  it("exports stable UIDs, exclusive end dates, annual rules and local morning alarms", () => {
    const events = upcoming(
      [special],
      [trip],
      "2026-10-28",
      new Date("2026-10-28T03:00:00Z"),
    );
    const ics = calendarFile(events[0]);
    expect(ics).toContain("UID:special-test@ourstory.local\r\n");
    expect(ics).toContain("DTEND;VALUE=DATE:20261029\r\n");
    expect(ics).toContain("RRULE:FREQ=YEARLY\r\n");
    expect(ics).toContain("TRIGGER:-P6DT15H");
    expect(ics).toContain("TRIGGER:PT9H");
    const journey = calendarFile(events[1]);
    expect(journey).not.toContain("RRULE");
    expect(journey).toContain("DTEND;VALUE=DATE:20261102");
    expect(journey).toContain("TRIGGER:-PT15H");
  });
  it("escapes ICS injection, folds Unicode at byte boundaries and encodes Google fields", () => {
    const event = upcoming(
      [{ ...special, title: "♡".repeat(35) + ",;\\\nBEGIN:VEVENT" }],
      [],
      "2026-10-28",
    )[0];
    const ics = calendarFile(event);
    expect(ics.split("\r\n").filter((l) => l === "BEGIN:VEVENT")).toHaveLength(
      1,
    );
    expect(ics.replace(/\r\n /g, "")).toContain("\\,\\;\\\\\\nBEGIN:VEVENT");
    expect(
      ics.split("\r\n").every((l) => new TextEncoder().encode(l).length <= 75),
    ).toBe(true);
    const params = new URL(googleCalendar(event)).searchParams;
    expect(params.get("text")).toBe(event.title);
    expect(params.get("recur")).toBe("RRULE:FREQ=YEARLY");
  });
  it("exports leap anniversary with the same February policy as the dashboard", () => {
    const event = upcoming(
      [{ ...special, date: "2024-02-29" }],
      [],
      "2027-01-01",
    )[0];
    expect(calendarFile(event)).toContain(
      "RRULE:FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=-1",
    );
  });
});
