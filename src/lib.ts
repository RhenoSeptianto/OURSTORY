import { createClient } from "@supabase/supabase-js";
const publicKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
// Require the modern publishable format: a misplaced administrative JWT must never initialize the client.
export const configured = Boolean(
  import.meta.env.VITE_SUPABASE_URL?.startsWith("https://") &&
  publicKey.startsWith("sb_publishable_") &&
  !import.meta.env.VITE_SUPABASE_URL.includes("your-project"),
);
export const db = configured
  ? createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {
          flowType: "pkce",
          detectSessionInUrl: true,
          persistSession: true,
          autoRefreshToken: true,
        },
      },
    )
  : null;
export interface RecordBase {
  id: string;
  version: number;
  created_by: string | null;
  updated_by: string | null;
  deleted_at?: string | null;
}
export interface Trip extends RecordBase {
  name: string;
  city: string;
  start_date: string;
  end_date: string;
  timezone: string;
  archived: boolean;
  cover_path: string | null;
}
export interface Destination extends RecordBase {
  trip_id: string;
  name: string;
  category: string;
  date: string | null;
  time: string | null;
  tentative: boolean;
  status: "Wishlist" | "Scheduled" | "Visited" | "Skipped";
  maps_url: string;
  photo_path: string | null;
  notes: string;
  sort_order: number;
}
export interface Memory extends RecordBase {
  trip_id: string;
  destination_id: string | null;
  title: string;
  story: string;
  date: string;
}
export interface Photo extends RecordBase {
  memory_id: string;
  path: string;
  caption: string;
  bytes: number;
}
export interface Member {
  id: string;
  display_name: string;
}
export interface Data {
  trips: Trip[];
  destinations: Destination[];
  memories: Memory[];
  photos: Photo[];
  members: Member[];
}
export const empty: Data = {
  trips: [],
  destinations: [],
  memories: [],
  photos: [],
  members: [],
};
export function localDate(timezone = "Asia/Jakarta", now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function tripStatus(t: Trip, now = new Date()) {
  const today = localDate(t.timezone, now);
  return t.archived
    ? "Archived"
    : today < t.start_date
      ? "Upcoming"
      : today > t.end_date
        ? "Completed"
        : "Ongoing";
}
export function progress(ds: Destination[]) {
  const planned = ds.filter((d) => !d.deleted_at && d.status !== "Wishlist");
  return planned.length
    ? Math.round(
        (planned.filter((d) => d.status === "Visited").length /
          planned.length) *
          100,
      )
    : 0;
}
export function dates(start: string, end: string) {
  const result: string[] = [];
  const d = new Date(start + "T00:00:00Z");
  while (d.toISOString().slice(0, 10) <= end && result.length < 366) {
    result.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return result;
}
export function fmt(date: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date + "T00:00:00Z"));
}
export const categories = [
  "Food",
  "Coffee",
  "Bakery",
  "Nature",
  "Shopping",
  "Hotel",
  "Transportation",
  "Other",
];
export async function save(table: string, value: object, old?: RecordBase) {
  if (!db || !navigator.onLine)
    throw Error("Sedang offline. Sambungkan internet sebelum menyimpan.");
  const query = old
    ? db.from(table).update(value).eq("id", old.id).eq("version", old.version)
    : db.from(table).insert(value);
  const { data, error } = await query.select().single();
  if (error)
    throw Error(
      error.code === "PGRST116"
        ? "Data sudah berubah di perangkat lain. Segarkan lalu ulangi perubahan."
        : error.message,
    );
  return data;
}
export function download(
  name: string,
  body: Blob | string,
  type = "application/json",
) {
  const url = URL.createObjectURL(
    typeof body === "string" ? new Blob([body], { type }) : body,
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
export const MAX_DIMENSION = 1800,
  MAX_BYTES = 1500000;
export async function optimize(file: File) {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 25000000
  )
    throw Error(
      "Pilih JPG, PNG, atau WebP hingga 25 MB. Ekspor HEIC sebagai JPG terlebih dahulu.",
    );
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  const ratio = Math.min(
    1,
    MAX_DIMENSION / Math.max(bitmap.width, bitmap.height),
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * ratio);
  canvas.height = Math.round(bitmap.height * ratio);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  let blob: Blob | null = null;
  for (let quality = 0.86; quality >= 0.36; quality -= 0.1) {
    blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", quality),
    );
    if (blob && blob.size <= MAX_BYTES) break;
  }
  if (!blob || blob.size > MAX_BYTES)
    throw Error("Foto masih terlalu besar. Pilih foto lebih kecil.");
  return blob;
}
