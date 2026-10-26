import { describe, it, expect } from "vitest";
import { visibleMemories, memoryLocation } from "./memories";
import type { Memory, Trip } from "./lib";
const trips = [
  { id: "bandung", name: "Bandung Date ♡" },
  { id: "deleted", name: "Deleted trip", deleted_at: "today" },
] as Trip[];
const albums = [
  { id: "free", trip_id: null, location: "Bogor" },
  { id: "linked", trip_id: "bandung" },
  { id: "hidden", trip_id: "deleted" },
  { id: "trash", trip_id: null, deleted_at: "today" },
] as Memory[];
describe("Independent albums and locations", () => {
  it("includes standalone albums without requiring a trip", () => {
    expect(visibleMemories(albums, trips).map((m) => m.id)).toEqual([
      "free",
      "linked",
    ]);
    expect(visibleMemories(albums, []).map((m) => m.id)).toEqual(["free"]);
  });
  it("filters standalone and trip albums without mixing them", () => {
    expect(
      visibleMemories(albums, trips, "standalone").map((m) => m.id),
    ).toEqual(["free"]);
    expect(visibleMemories(albums, trips, "bandung").map((m) => m.id)).toEqual([
      "linked",
    ]);
  });
  it("uses custom location before trip label and handles legacy albums", () => {
    expect(memoryLocation(albums[0], trips)).toBe("Bogor");
    expect(memoryLocation(albums[1], trips)).toBe("Bandung Date ♡");
    expect(memoryLocation({ trip_id: null } as Memory, trips)).toBe(
      "Album bebas",
    );
  });
});
