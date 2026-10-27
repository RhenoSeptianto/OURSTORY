import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Camera,
  Check,
  ImagePlus,
  Move,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { Modal, PrivateImage } from "../components";
import { optimize } from "../images";
import type { Data } from "../lib";
import {
  errorMessage,
  ensurePolaroidAlbum,
  storeNewPhoto,
  writeGallery,
} from "./api";
import {
  defaultCrop,
  eligiblePhotos,
  MAX_POLAROIDS,
  reorder,
  resolveSelection,
  selection,
  serialized,
  slidesFor,
} from "./model";
import type { DraftPhoto, GalleryRecord, PolaroidItem } from "./model";
import { PolaroidPlayer, SlideImage } from "./PolaroidPlayer";
export function PolaroidEditor({
  initial,
  current,
  data,
  online,
  onClose,
  onSaved,
  onRefresh,
}: {
  initial: GalleryRecord;
  current: GalleryRecord | null;
  data: Data;
  online: boolean;
  onClose: () => void;
  onSaved: (record: GalleryRecord) => void;
  onRefresh: () => Promise<void>;
}) {
  const available = eligiblePhotos(data);
  const [base, setBase] = useState(initial),
    [draft, setDraft] = useState<DraftPhoto[]>(() =>
      initial.photos.map((p) => ({ ...p })),
    ),
    [picker, setPicker] = useState(false),
    [replace, setReplace] = useState<string | null>(null),
    [query, setQuery] = useState(""),
    [limit, setLimit] = useState(12),
    [cropId, setCropId] = useState<string | null>(null),
    [error, setError] = useState(""),
    [stage, setStage] = useState(""),
    [saving, setSaving] = useState(false),
    [notice, setNotice] = useState(""),
    [preview, setPreview] = useState(false);
  const urls = useRef(new Set<string>()),
    alive = useRef(true),
    albumId = useRef<string | null>(null),
    fileRef = useRef<HTMLInputElement>(null),
    drag = useRef<{
      x: number;
      y: number;
      startX: number;
      startY: number;
    } | null>(null);
  useEffect(() => {
    alive.current = true;
    const localUrls = urls.current;
    return () => {
      alive.current = false;
      localUrls.forEach((url) => URL.revokeObjectURL(url));
      localUrls.clear();
    };
  }, []);
  const busy = saving || Boolean(stage),
    changedElsewhere = Boolean(current && current.version !== base.version);
  const release = (item: DraftPhoto) => {
    if (item.local) {
      URL.revokeObjectURL(item.local.url);
      urls.current.delete(item.local.url);
    }
  };
  const close = () => {
    if (!saving) onClose();
  };
  const update = (id: string, value: Partial<PolaroidItem>) =>
    setDraft((items) =>
      items.map((item) =>
        item.photo_id === id ? { ...item, ...value } : item,
      ),
    );
  const add = (item: DraftPhoto) => {
    if (replace) {
      const old = draft.find((i) => i.photo_id === replace);
      if (old) release(old);
    }
    setDraft((items) => {
      if (
        items.some(
          (i) => i.photo_id === item.photo_id && i.photo_id !== replace,
        )
      )
        return items;
      if (replace) return items.map((i) => (i.photo_id === replace ? item : i));
      return items.length < MAX_POLAROIDS ? [...items, item] : items;
    });
    setReplace(null);
    setPicker(false);
    setQuery("");
    setNotice("");
  };
  const uploadLocal = async (file?: File) => {
    if (!file) return;
    setError("");
    try {
      setStage("Membaca gambar…");
      const blob = await optimize(file, {
        onStage: (message) => {
          if (alive.current) setStage(message);
        },
      });
      if (!alive.current) return;
      const url = URL.createObjectURL(blob);
      urls.current.add(url);
      add({
        ...selection({ id: crypto.randomUUID(), caption: "" }),
        local: { blob, url },
      });
    } catch (e) {
      if (alive.current) setError(errorMessage(e));
    } finally {
      if (alive.current) setStage("");
    }
  };
  const save = async () => {
    setError("");
    if (!online || !navigator.onLine) {
      setError("Sedang offline. Sambungkan internet sebelum menyimpan.");
      return;
    }
    setSaving(true);
    const committed: DraftPhoto[] = [];
    try {
      serialized(draft);
      if (
        draft.some(
          (item) =>
            !item.local &&
            !item.uploaded &&
            !available.some((photo) => photo.id === item.photo_id),
        )
      )
        throw Error(
          "Ada foto sumber yang belum tersedia. Segarkan foto Kenangan atau lepas pilihan tersebut sebelum menyimpan.",
        );
      for (const item of draft) {
        let next = item;
        if (item.local && !item.uploaded) {
          setStage("Menyimpan foto baru ke Kenangan…");
          albumId.current ??= await ensurePolaroidAlbum(data);
          const photo = await storeNewPhoto(item, albumId.current);
          next = { ...item, local: undefined, uploaded: photo };
          release(item);
          setDraft((items) =>
            items.map((i) => (i.photo_id === item.photo_id ? next : i)),
          );
          setNotice(
            "Foto baru yang berhasil diunggah tersimpan di Kenangan, meskipun pengaturan galeri belum tersimpan.",
          );
        }
        committed.push(next);
      }
      setStage("Menyimpan pilihan Polaroid…");
      const record = await writeGallery(base, committed);
      onSaved(record);
      await onRefresh();
      onClose();
    } catch (e) {
      setError(errorMessage(e));
      void onRefresh();
    } finally {
      if (alive.current) {
        setSaving(false);
        setStage("");
      }
    }
  };
  const chosen = draft.find((i) => i.photo_id === cropId),
    chosenSlide = chosen ? slidesFor([chosen], available)[0] : null;
  const pickedIds = new Set(draft.map((p) => p.photo_id));
  const pool = available.filter((p) => {
    const album = data.memories.find((m) => m.id === p.memory_id);
    return `${album?.title || ""} ${p.caption}`
      .toLocaleLowerCase("id-ID")
      .includes(query.trim().toLocaleLowerCase("id-ID"));
  });
  const missing =
    initial.photos.length - resolveSelection(initial.photos, available).length;
  return (
    <Modal
      title="Customize Our Polaroids ♡"
      className="polaroid-dialog"
      onClose={close}
    >
      <div className="polaroid-editor">
        <p className="muted">
          Pilih sampai lima foto kesayangan kita. Foto asli tetap ada di
          Kenangan.
        </p>
        {!online && (
          <p className="error" role="alert">
            Sedang offline. Edit dan Simpan tersedia setelah terhubung.
          </p>
        )}
        {changedElsewhere && (
          <div className="editor-warning" role="status">
            Pilihan bersama telah diperbarui di perangkat lain. Draft kamu belum
            berubah.
            <button
              className="text-button"
              disabled={busy}
              onClick={() => {
                if (current && confirm("Ganti draft dengan pilihan terbaru?")) {
                  draft.forEach(release);
                  setBase(current);
                  setDraft(
                    current.photos.map((i) => ({
                      ...i,
                    })),
                  );
                  setError("");
                  setCropId(null);
                  setPicker(false);
                  setReplace(null);
                }
              }}
            >
              <RefreshCw size={14} /> Muat pilihan terbaru
            </button>
          </div>
        )}
        {missing > 0 && (
          <p className="editor-warning">
            {missing} foto sumber belum tersedia atau albumnya di Sampah. Foto
            dilewati di dashboard. Segarkan Kenangan atau lepas pilihan yang
            tidak tersedia sebelum menyimpan.
            <button
              className="text-button"
              disabled={busy}
              onClick={() => void onRefresh()}
            >
              Segarkan foto Kenangan
            </button>
          </p>
        )}
        <div className="polaroid-editor-toolbar">
          <strong>
            {draft.length} / {MAX_POLAROIDS} foto
          </strong>
          <button
            className="text-button"
            disabled={busy}
            onClick={() => setPreview(!preview)}
          >
            <Camera size={15} />
            {preview ? "Tutup pratinjau" : "Pratinjau galeri"}
          </button>
        </div>
        {preview && (
          <div className="polaroid-preview">
            <div className="polaroid">
              <PolaroidPlayer
                slides={slidesFor(draft, available)}
                paused
                label="Pratinjau Polaroid"
              />
            </div>
          </div>
        )}
        <fieldset disabled={busy || !online} className="polaroid-fields">
          {!draft.length && (
            <div className="polaroid-empty">
              <ImagePlus size={28} />
              <p>Add our first memory ♡</p>
            </div>
          )}
          <ol className="polaroid-selection">
            {draft.map((item, index) => {
              const photo = slidesFor([item], available)[0];
              return (
                <li key={item.photo_id}>
                  <div className="polaroid-thumb">
                    {photo ? (
                      <SlideImage slide={photo} />
                    ) : (
                      <span>Foto tidak tersedia</span>
                    )}
                  </div>
                  <div className="polaroid-item-fields">
                    <label>
                      Caption foto {index + 1}
                      <input
                        maxLength={120}
                        value={item.caption}
                        onChange={(e) =>
                          update(item.photo_id, { caption: e.target.value })
                        }
                        placeholder="Catatan kecil, opsional"
                      />
                    </label>
                    <div className="polaroid-item-actions">
                      <button
                        className="text-button"
                        onClick={() => {
                          setReplace(item.photo_id);
                          setPicker(true);
                        }}
                      >
                        Ganti foto
                      </button>
                      <button
                        className="text-button"
                        aria-expanded={cropId === item.photo_id}
                        onClick={() =>
                          setCropId(
                            cropId === item.photo_id ? null : item.photo_id,
                          )
                        }
                      >
                        <Move size={14} /> Atur posisi
                      </button>
                    </div>
                  </div>
                  <div className="polaroid-order">
                    <button
                      className="icon-button"
                      disabled={index === 0}
                      aria-label={`Naikkan foto ${index + 1}`}
                      onClick={() =>
                        setDraft((items) => reorder(items, index, index - 1))
                      }
                    >
                      <ArrowUp size={16} />
                    </button>
                    <button
                      className="icon-button"
                      disabled={index === draft.length - 1}
                      aria-label={`Turunkan foto ${index + 1}`}
                      onClick={() =>
                        setDraft((items) => reorder(items, index, index + 1))
                      }
                    >
                      <ArrowDown size={16} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`Lepas foto ${index + 1}`}
                      onClick={() => {
                        release(item);
                        setDraft((items) =>
                          items.filter((i) => i.photo_id !== item.photo_id),
                        );
                        if (cropId === item.photo_id) setCropId(null);
                        if (replace === item.photo_id) {
                          setPicker(false);
                          setReplace(null);
                        }
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
          {chosen && chosenSlide && (
            <section className="polaroid-position">
              <div className="section-heading">
                <h3>Posisi foto</h3>
                <button
                  className="text-button"
                  onClick={() => update(chosen.photo_id, defaultCrop)}
                >
                  Reset posisi
                </button>
              </div>
              <p>
                Foto utuh adalah tampilan awal. Geser pratinjau atau gunakan
                penggeser di bawah untuk mengatur bingkai.
              </p>
              <div
                className="crop-viewport"
                onPointerDown={(e) => {
                  if (!e.isPrimary) return;
                  e.currentTarget.setPointerCapture(e.pointerId);
                  drag.current = {
                    x: e.clientX,
                    y: e.clientY,
                    startX: chosen.x,
                    startY: chosen.y,
                  };
                }}
                onPointerUp={() => {
                  drag.current = null;
                }}
                onPointerCancel={() => {
                  drag.current = null;
                }}
                onPointerMove={(e) => {
                  if (!drag.current) return;
                  const bounds = e.currentTarget.getBoundingClientRect(),
                    sign = chosen.fit === "cover" || chosen.zoom > 1 ? -1 : 1;
                  const clamp = (v: number) =>
                    Math.round(Math.max(0, Math.min(100, v)));
                  update(chosen.photo_id, {
                    x: clamp(
                      drag.current.startX +
                        ((sign * (e.clientX - drag.current.x)) / bounds.width) *
                          100,
                    ),
                    y: clamp(
                      drag.current.startY +
                        ((sign * (e.clientY - drag.current.y)) /
                          bounds.height) *
                          100,
                    ),
                  });
                }}
              >
                <SlideImage slide={chosenSlide} />
              </div>
              <div className="crop-fit">
                <button
                  className={chosen.fit === "contain" ? "" : "secondary"}
                  aria-pressed={chosen.fit === "contain"}
                  onClick={() => update(chosen.photo_id, { fit: "contain" })}
                >
                  Foto utuh
                </button>
                <button
                  className={chosen.fit === "cover" ? "" : "secondary"}
                  aria-pressed={chosen.fit === "cover"}
                  onClick={() => update(chosen.photo_id, { fit: "cover" })}
                >
                  Isi bingkai
                </button>
              </div>
              <label>
                Zoom · {chosen.zoom.toFixed(1)}×
                <input
                  aria-label="Zoom foto"
                  type="range"
                  min="1"
                  max="3"
                  step="0.1"
                  value={chosen.zoom}
                  onChange={(e) =>
                    update(chosen.photo_id, { zoom: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                Posisi horizontal
                <input
                  aria-label="Posisi horizontal"
                  type="range"
                  min="0"
                  max="100"
                  value={chosen.x}
                  onChange={(e) =>
                    update(chosen.photo_id, { x: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                Posisi vertikal
                <input
                  aria-label="Posisi vertikal"
                  type="range"
                  min="0"
                  max="100"
                  value={chosen.y}
                  onChange={(e) =>
                    update(chosen.photo_id, { y: Number(e.target.value) })
                  }
                />
              </label>
            </section>
          )}
          <div className="polaroid-add-actions">
            <button
              className="secondary"
              disabled={draft.length >= MAX_POLAROIDS}
              onClick={() => {
                setReplace(null);
                setPicker(!picker);
              }}
            >
              <ImagePlus size={16} /> Pilih dari Kenangan
            </button>
            <button
              className="secondary"
              disabled={draft.length >= MAX_POLAROIDS}
              onClick={() => {
                setReplace(null);
                fileRef.current?.click();
              }}
            >
              <ImagePlus size={16} /> Unggah foto baru
            </button>
          </div>
          {draft.length >= MAX_POLAROIDS && (
            <p className="muted">
              Lima foto sudah dipilih. Lepas atau ganti salah satu untuk
              menambah foto lain.
            </p>
          )}
          {picker && (
            <section className="polaroid-picker">
              <div className="section-heading">
                <h3>
                  {replace ? "Ganti foto pilihan" : "Pilih foto kenangan"}
                </h3>
                <button
                  className="icon-button"
                  aria-label="Tutup pemilih foto"
                  onClick={() => {
                    setPicker(false);
                    setReplace(null);
                  }}
                >
                  <X size={18} />
                </button>
              </div>
              <input
                type="search"
                aria-label="Cari foto album"
                placeholder="Cari judul album atau caption…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setLimit(12);
                }}
              />
              <div className="polaroid-picker-grid">
                {pool.slice(0, limit).map((photo) => (
                  <button
                    key={photo.id}
                    className="polaroid-pick"
                    disabled={pickedIds.has(photo.id)}
                    aria-label={`Pilih foto ${data.memories.find((m) => m.id === photo.memory_id)?.title || "kenangan"} ${photo.id}`}
                    onClick={() => add(selection(photo))}
                  >
                    <PrivateImage
                      path={photo.path}
                      alt={
                        photo.caption ||
                        data.memories.find((m) => m.id === photo.memory_id)
                          ?.title ||
                        "Foto kenangan"
                      }
                    />
                    {pickedIds.has(photo.id) && (
                      <span>
                        <Check size={14} /> Dipilih
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {!pool.length && (
                <p>
                  Belum ada foto yang sesuai. Kamu bisa mengunggah foto baru.
                </p>
              )}
              {pool.length > limit && (
                <button
                  className="text-button"
                  onClick={() => setLimit((n) => n + 12)}
                >
                  Tampilkan foto berikutnya
                </button>
              )}
              {replace && (
                <button
                  className="secondary"
                  onClick={() => fileRef.current?.click()}
                >
                  <ImagePlus size={16} /> Ganti dengan foto baru
                </button>
              )}
            </section>
          )}
          <input
            ref={fileRef}
            type="file"
            aria-label="Unggah foto Polaroid"
            accept="image/*,.heic,.heif"
            hidden
            onChange={(e) => {
              void uploadLocal(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </fieldset>
        {stage && (
          <p role="status" className="muted">
            {stage}
          </p>
        )}
        {notice && <p className="editor-warning">{notice}</p>}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <small>
          Foto baru diunggah hanya saat Simpan. Melepas pilihan tidak menghapus
          foto aslinya.
        </small>
        <div className="polaroid-save-actions">
          <button className="secondary" disabled={saving} onClick={close}>
            Batal
          </button>
          <button disabled={busy || !online} onClick={() => void save()}>
            {saving ? "Menyimpan…" : "Simpan Polaroid"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
