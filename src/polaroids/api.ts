import { db, localDate, save } from "../lib";
import type { Data, Photo } from "../lib";
import { imageExtension } from "../images";
import { GALLERY_ID, serialized } from "./model";
import type { DraftPhoto, GalleryRecord, PolaroidItem } from "./model";
export async function readGallery(): Promise<GalleryRecord> {
  if (!db) throw Error("Koneksi privat belum tersedia.");
  const { data, error } = await db
    .from("dashboard_polaroids")
    .select("*")
    .eq("id", GALLERY_ID)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw Error("Pengaturan galeri belum tersedia.");
  return data as GalleryRecord;
}
export async function writeGallery(
  record: GalleryRecord,
  items: PolaroidItem[],
) {
  return (await save(
    "dashboard_polaroids",
    { photos: serialized(items) },
    record,
  )) as GalleryRecord;
}
export function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : typeof error === "object" && error && "message" in error
      ? String(error.message)
      : "Terjadi kesalahan. Coba lagi.";
}
export function missingGallery(error: unknown) {
  return (
    typeof error === "object" &&
    error &&
    "code" in error &&
    ["PGRST205", "42P01"].includes(String(error.code))
  );
}
export async function ensurePolaroidAlbum(data: Data) {
  const existing = data.memories.find(
    (m) => !m.deleted_at && !m.trip_id && m.title === "Our Polaroids ♡",
  );
  if (existing) return existing.id;
  const album = await save("memories", {
    trip_id: null,
    destination_id: null,
    title: "Our Polaroids ♡",
    location: "",
    story: "Foto pilihan untuk Polaroid dashboard kita.",
    date: localDate(),
  });
  return album.id as string;
}
/** Stable photo ID/path make retry safe without duplicating uploads. Never deletes committed Memories photos. */
export async function storeNewPhoto(
  draft: DraftPhoto,
  albumId: string,
): Promise<Photo> {
  if (draft.uploaded) return draft.uploaded;
  if (!draft.local || !db || !navigator.onLine)
    throw Error("Sambungkan internet sebelum menyimpan foto.");
  const lookup = () =>
    db!
      .from("memory_photos")
      .select("*")
      .eq("id", draft.photo_id)
      .maybeSingle();
  const found = await lookup();
  if (found.error) throw found.error;
  if (found.data) return found.data as Photo;
  const path = `shared/polaroid-${draft.photo_id}.${imageExtension(draft.local.blob.type)}`;
  const upload = await db.storage
    .from("memories")
    .upload(path, draft.local.blob, {
      contentType: draft.local.blob.type,
      upsert: false,
    });
  if (
    upload.error &&
    !("statusCode" in upload.error && String(upload.error.statusCode) === "409")
  )
    throw upload.error;
  try {
    return (await save("memory_photos", {
      id: draft.photo_id,
      memory_id: albumId,
      path,
      bytes: draft.local.blob.size,
      caption: "",
    })) as Photo;
  } catch (error) {
    const confirmed = await lookup();
    if (confirmed.data) return confirmed.data as Photo;
    if (!confirmed.error) {
      const cleanup = await db.storage.from("memories").remove([path]);
      if (cleanup.error)
        throw Error(
          errorMessage(error) +
            " Pembersihan berkas privat gagal; administrator perlu memeriksa berkas yatim.",
          { cause: error },
        );
    } else
      throw Error(
        "Status unggahan belum dapat dipastikan. Sambungkan internet dan coba Simpan lagi; jangan unggah salinan baru.",
        { cause: error },
      );
    throw error;
  }
}
