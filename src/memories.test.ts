import { describe, it, expect } from "vitest";
import { visibleMemories, memoryLocation } from "./memories";
import type { Memory, Trip } from "./lib";
const trips = [
  { id: "bandung", name: "Bandung Date ♡" },
  { id: "deleted", name: "Deleted trip", deleted_at: "today" },
] as Trip[];
const albums = [
  { id: "free", title: "Sayang Fadla", trip_id: null, location: "Bogor" },
  { id: "linked", title: "Kopi Sore", trip_id: "bandung" },
  { id: "hidden", title: "Sayang", trip_id: "deleted" },
  { id: "trash", title: "Sayang Fadla", trip_id: null, deleted_at: "today" },
] as Memory[];
describe("Independent albums and locations", () => {
  it("includes standalone albums without requiring a trip", () => {
    expect(visibleMemories(albums, trips).map((m) => m.id)).toEqual([
      "free",
      "linked",
    ]);
    expect(visibleMemories(albums, []).map((m) => m.id)).toEqual(["free"]);
  });
  it("searches manually entered titles without exposing deleted albums", () => {
    expect(visibleMemories(albums, trips, "  FADLA ").map((m) => m.id)).toEqual(
      ["free"],
    );
    expect(visibleMemories(albums, trips, "kopi").map((m) => m.id)).toEqual([
      "linked",
    ]);
    expect(visibleMemories(albums, trips, "Bandung")).toEqual([]);
    const renamed = albums.map((m) =>
      m.id === "free" ? { ...m, title: "Cerita Baru" } : m,
    );
    expect(visibleMemories(renamed, trips, "Fadla")).toEqual([]);
    expect(visibleMemories(renamed, trips, "cerita").map((m) => m.id)).toEqual([
      "free",
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
