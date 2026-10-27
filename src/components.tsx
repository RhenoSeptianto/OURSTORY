import { useEffect, useRef, useState } from "react";
import { X, ImagePlus, LoaderCircle } from "lucide-react";
import { db, optimize } from "./lib";
import { imageExtension } from "./images";
import type { ReactNode } from "react";
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const root = useRef<HTMLElement>(null),
    close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const handler = (e: KeyboardEvent) => {
      const dialogs = document.querySelectorAll('[role="dialog"]');
      if (dialogs[dialogs.length - 1] !== root.current) return;
      if (e.key === "Escape") close.current();
      if (e.key === "Tab") {
        const els = [
          ...root.current!.querySelectorAll<HTMLElement>(
            "button,input,select,textarea,a[href]",
          ),
        ].filter((el) => !(el as HTMLButtonElement).disabled);
        const first = els[0],
          last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    root.current?.querySelector<HTMLElement>("button")?.focus();
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow =
        document.querySelectorAll('[role="dialog"]').length > 1 ? "hidden" : "";
      previous?.focus();
    };
  }, []);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        ref={root}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="modal"
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <h2>{title}</h2>
          <button
            className="icon-button"
            aria-label="Tutup dialog"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
export function PrivateImage({
  path,
  alt,
  className = "",
  onClick,
}: {
  path?: string | null;
  alt: string;
  className?: string;
  onClick?: () => void;
}) {
  const [url, setUrl] = useState(""),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      setFailed(false);
      const result = await db!.storage
        .from("memories")
        .createSignedUrl(path!, 180);
      if (alive) {
        setUrl(result.data?.signedUrl || "");
        setFailed(Boolean(result.error));
      }
    };
    setUrl("");
    if (!path) return;
    void load();
    const timer = setInterval(() => void load(), 150000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [path]);
  return url ? (
    <img
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      className={className}
      src={url}
      alt={alt}
      onClick={onClick}
    />
  ) : (
    <div className={"image-placeholder " + className}>
      <ImagePlus size={32} />
      <span>{failed ? "Foto tidak tersedia" : alt}</span>
    </div>
  );
}
export function Upload({
  onUpload,
  label = "Tambah foto",
  disabled = false,
}: {
  onUpload: (path: string, bytes: number) => Promise<void>;
  label?: string;
  disabled?: boolean;
}) {
  const [stage, setStage] = useState(""),
    [error, setError] = useState("");
  const upload = async (file?: File) => {
    if (!file) return;
    let path = "";
    setError("");
    try {
      setStage("Mengoptimalkan…");
      const blob = await optimize(file, { onStage: setStage });
      path = `shared/${crypto.randomUUID()}.${imageExtension(blob.type)}`;
      setStage("Mengunggah…");
      const { error } = await db!.storage
        .from("memories")
        .upload(path, blob, { contentType: blob.type, upsert: false });
      if (error) throw error;
      setStage("Menyimpan…");
      await onUpload(path, blob.size);
    } catch (e) {
      if (path) {
        const cleanup = await db!.storage.from("memories").remove([path]);
        if (cleanup.error)
          setError("Pembersihan gagal; periksa berkas yatim di Storage. ");
      }
      setError(
        (v) =>
          v +
          (e instanceof Error ? e.message : (e as { message: string }).message),
      );
    } finally {
      setStage("");
    }
  };
  return (
    <div className="upload">
      <label
        className={"button secondary " + (disabled || stage ? "disabled" : "")}
      >
        {stage ? (
          <LoaderCircle className="spin" size={16} />
        ) : (
          <ImagePlus size={16} />
        )}{" "}
        {stage || label}
        <input
          type="file"
          accept="image/*,.heic,.heif"
          disabled={disabled || Boolean(stage)}
          onChange={(e) => {
            void upload(e.target.files?.[0]);
            e.target.value = "";
          }}
          hidden
        />
      </label>
      <small>
        Salinan optimal · maks. 1800 px · foto asli tetap simpan sendiri.
      </small>
      {error && (
        <p role="alert" className="error">
          {error} Pilih ulang foto untuk mencoba lagi.
        </p>
      )}
    </div>
  );
}
