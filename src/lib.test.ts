import { describe, it, expect } from "vitest";
import { dates, localDate, progress, tripStatus } from "./lib";
import type { Destination, Trip } from "./lib";
const trip = {
  start_date: "2026-10-30",
  end_date: "2026-11-01",
  timezone: "Asia/Jakarta",
  archived: false,
} as Trip;
describe("Trip dates in destination timezone", () => {
  it("uses Jakarta day across UTC midnight", () => {
    expect(localDate("Asia/Jakarta", new Date("2026-10-29T18:00:00Z"))).toBe(
      "2026-10-30",
    );
  });
  it("includes the entire last day in ongoing status", () => {
    expect(tripStatus(trip, new Date("2026-11-01T16:59:00Z"))).toBe("Ongoing");
    expect(tripStatus(trip, new Date("2026-11-01T17:00:00Z"))).toBe(
      "Completed",
    );
  });
  it("distinguishes future and archived", () => {
    expect(tripStatus(trip, new Date("2026-10-26T00:00:00Z"))).toBe("Upcoming");
    expect(tripStatus({ ...trip, archived: true })).toBe("Archived");
  });
  it("builds inclusive tabs over month and leap-day boundaries", () => {
    expect(dates("2026-10-30", "2026-11-01")).toEqual([
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
    ]);
    expect(dates("2028-02-28", "2028-03-01")).toHaveLength(3);
  });
});
describe("Honest checklist progress", () => {
  it("does not count skipped places as visited", () => {
    expect(
      progress([
        { status: "Visited" },
        { status: "Skipped" },
        { status: "Wishlist" },
        { status: "Scheduled", deleted_at: "today" },
      ] as Destination[]),
    ).toBe(50);
  });
  it("handles empty and wishlist-only plans", () => {
    expect(progress([])).toBe(0);
    expect(progress([{ status: "Wishlist" }] as Destination[])).toBe(0);
  });
});
