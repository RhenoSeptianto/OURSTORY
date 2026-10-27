import type { Data, Photo, RecordBase } from "../lib";
import { visibleMemories } from "../memories";
export const GALLERY_ID = "30000000-0000-4000-8000-000000000001";
export const MAX_POLAROIDS = 5;
export interface PolaroidItem {
  photo_id: string;
  caption: string;
  fit: "contain" | "cover";
  x: number;
  y: number;
  zoom: number;
}
export interface GalleryRecord extends RecordBase {
  photos: PolaroidItem[];
}
export interface DraftPhoto extends PolaroidItem {
  local?: { blob: Blob; url: string };
  uploaded?: Photo;
}
export interface Slide extends PolaroidItem {
  path?: string;
  url?: string;
}
export const defaultCrop = { fit: "contain" as const, x: 50, y: 50, zoom: 1 };
export function selection(photo: Pick<Photo, "id" | "caption">): PolaroidItem {
  let caption = "";
  for (const character of photo.caption) {
    if (caption.length + character.length > 120) break;
    caption += character;
  }
  return {
    photo_id: photo.id,
    caption,
    ...defaultCrop,
  };
}
export function eligiblePhotos(data: Data) {
  const active = new Set(
    visibleMemories(data.memories, data.trips).map((m) => m.id),
  );
  return data.photos.filter((p) => active.has(p.memory_id));
}
export function resolveSelection(items: PolaroidItem[], photos: Photo[]) {
  const ids = new Set(photos.map((p) => p.id));
  return items.filter((item) => ids.has(item.photo_id));
}
export function reorder<T>(items: T[], from: number, to: number) {
  const next = [...items];
  if (from < 0 || to < 0 || from >= next.length || to >= next.length)
    return next;
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
export function validateSelection(items: PolaroidItem[]) {
  if (items.length > MAX_POLAROIDS) throw Error("Maksimal lima foto Polaroid.");
  if (new Set(items.map((i) => i.photo_id)).size !== items.length)
    throw Error("Foto yang sama hanya boleh dipilih sekali.");
  for (const item of items) {
    if (
      !item.photo_id ||
      typeof item.caption !== "string" ||
      item.caption.length > 120 ||
      !["contain", "cover"].includes(item.fit) ||
      ![item.x, item.y, item.zoom].every(Number.isFinite) ||
      item.x < 0 ||
      item.x > 100 ||
      item.y < 0 ||
      item.y > 100 ||
      item.zoom < 1 ||
      item.zoom > 3
    )
      throw Error("Caption atau posisi foto tidak valid.");
  }
}
export function serialized(items: PolaroidItem[]): PolaroidItem[] {
  validateSelection(items);
  return items.map(({ photo_id, caption, fit, x, y, zoom }) => ({
    photo_id,
    caption,
    fit,
    x,
    y,
    zoom,
  }));
}
export function slidesFor(items: DraftPhoto[], photos: Photo[]): Slide[] {
  return items.flatMap<Slide>((item) => {
    const photo = item.uploaded || photos.find((p) => p.id === item.photo_id);
    return item.local && !item.uploaded
      ? [{ ...item, url: item.local.url }]
      : photo
        ? [{ ...item, path: photo.path }]
        : [];
  });
}
