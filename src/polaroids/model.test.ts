import { describe, it, expect } from "vitest";
import {
  defaultCrop,
  eligiblePhotos,
  MAX_POLAROIDS,
  reorder,
  resolveSelection,
  selection,
  serialized,
  slidesFor,
  validateSelection,
} from "./model";
import type { Data, Photo } from "../lib";
const photo = (id: string): Photo => ({
  id,
  caption: "A little memory",
  memory_id: "album",
  path: "shared/" + id + ".webp",
  bytes: 100,
  version: 1,
  created_by: null,
  updated_by: null,
});
describe("Polaroid drafts and references", () => {
  it("starts with the entire image rather than a destructive crop", () => {
    expect(selection(photo("1"))).toMatchObject(defaultCrop);
    expect(selection(photo("1")).photo_id).toBe("1");
  });
  it("truncates source captions without splitting an emoji", () => {
    expect(
      selection({ ...photo("1"), caption: "a".repeat(119) + "♡💗" }).caption,
    ).toBe("a".repeat(119) + "♡");
    expect(
      selection({ ...photo("1"), caption: "a".repeat(119) + "💗" }).caption,
    ).toBe("a".repeat(119));
  });
  it("enforces maximum five and disallows duplicate sources", () => {
    const items = Array.from({ length: MAX_POLAROIDS }, (_, i) =>
      selection(photo(String(i))),
    );
    expect(() => validateSelection(items)).not.toThrow();
    expect(() => validateSelection([...items, selection(photo("6"))])).toThrow(
      "lima",
    );
    expect(() => validateSelection([items[0], items[0]])).toThrow("sekali");
  });
  it("validates crop and caption bounds", () => {
    for (const patch of [
      { zoom: 4 },
      { x: -1 },
      { y: 101 },
      { zoom: NaN },
      { caption: "x".repeat(121) },
    ])
      expect(() =>
        validateSelection([{ ...selection(photo("1")), ...patch }]),
      ).toThrow("valid");
  });
  it("reorders without mutating saved selections", () => {
    const source = ["a", "b", "c"];
    expect(reorder(source, 0, 2)).toEqual(["b", "c", "a"]);
    expect(source).toEqual(["a", "b", "c"]);
    expect(reorder(source, 0, -1)).toEqual(source);
  });
  it("serializes only metadata and leaves source captions untouched", () => {
    const source = photo("1"),
      draft = {
        ...selection(source),
        caption: "Dashboard only",
        local: { blob: new Blob(["test"]), url: "blob:private" },
      };
    expect(serialized([draft])).toEqual([
      { photo_id: "1", caption: "Dashboard only", ...defaultCrop },
    ]);
    expect(source.caption).toBe("A little memory");
    expect(JSON.stringify(serialized([draft]))).not.toContain("blob:");
  });
  it("drops missing sources without deleting their originals", () => {
    const originals = [photo("1")];
    expect(
      resolveSelection(
        [selection(photo("1")), selection(photo("2"))],
        originals,
      ),
    ).toHaveLength(1);
    expect(originals).toHaveLength(1);
  });
  it("does not offer photographs from trashed albums or trips", () => {
    const data = {
      trips: [{ id: "deleted", deleted_at: "today" }],
      memories: [
        { id: "album", trip_id: null },
        { id: "trash", trip_id: null, deleted_at: "today" },
        { id: "trip-trash", trip_id: "deleted" },
      ],
      photos: [
        photo("1"),
        { ...photo("2"), memory_id: "trash" },
        { ...photo("3"), memory_id: "trip-trash" },
      ],
    } as Data;
    expect(eligiblePhotos(data).map((p) => p.id)).toEqual(["1"]);
  });
  it("uses local previews before upload and the existing private reference after upload", () => {
    const source = photo("1");
    expect(
      slidesFor(
        [
          {
            ...selection(source),
            local: { blob: new Blob(), url: "blob:preview" },
          },
        ],
        [],
      )[0].url,
    ).toBe("blob:preview");
    expect(
      slidesFor(
        [
          {
            ...selection(source),
            uploaded: source,
            local: { blob: new Blob(), url: "blob:preview" },
          },
        ],
        [],
      )[0].path,
    ).toBe(source.path);
  });
});
