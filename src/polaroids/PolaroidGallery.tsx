import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Edit3, RefreshCw } from "lucide-react";
import type { Data } from "../lib";
import { eligiblePhotos, resolveSelection, slidesFor } from "./model";
import type { GalleryRecord } from "./model";
import { usePolaroids } from "./usePolaroids";
import { PolaroidPlayer } from "./PolaroidPlayer";
import { PolaroidEditor } from "./PolaroidEditor";
import "./polaroids.css";
export function PolaroidGallery({
  data,
  memberId,
  online,
  onRefresh,
}: {
  data: Data;
  memberId: string;
  online: boolean;
  onRefresh: () => Promise<void>;
}) {
  const gallery = usePolaroids(memberId),
    [editing, setEditing] = useState<GalleryRecord | null>(null),
    [notice, setNotice] = useState("");
  const photos = useMemo(() => eligiblePhotos(data), [data]);
  const slides = slidesFor(
    resolveSelection(gallery.record?.photos || [], photos),
    photos,
  );
  return (
    <>
      <div className="polaroid big dashboard-polaroid">
        <PolaroidPlayer slides={slides} paused={Boolean(editing)} />
        <button
          className="polaroid-edit"
          aria-label="Atur foto Polaroid"
          title={
            !online
              ? "Sambungkan internet untuk mengedit"
              : gallery.status === "missing"
                ? "Galeri dashboard belum diaktifkan"
                : "Atur foto Polaroid"
          }
          disabled={!online || !gallery.record}
          onClick={() => {
            setNotice("");
            setEditing(gallery.record);
          }}
        >
          <Edit3 size={17} />
        </button>
        {gallery.status === "loading" && (
          <small className="polaroid-feedback" role="status">
            Menyiapkan Polaroid…
          </small>
        )}
        {gallery.error && (
          <div className="polaroid-feedback" role="status">
            <span>
              {gallery.status === "missing"
                ? gallery.error
                : "Galeri belum dapat diperbarui."}
            </span>
            <button
              className="icon-button"
              aria-label="Coba muat galeri lagi"
              onClick={() => void gallery.refresh()}
            >
              <RefreshCw size={14} />
            </button>
          </div>
        )}
        {gallery.interrupted && gallery.record && !gallery.error && (
          <button
            className="text-button polaroid-feedback"
            onClick={() => void gallery.refresh()}
          >
            Sinkronisasi terputus · segarkan
          </button>
        )}
        {notice && (
          <small className="polaroid-feedback" role="status">
            {notice}
          </small>
        )}
      </div>
      {editing &&
        createPortal(
          <PolaroidEditor
            initial={editing}
            current={gallery.record}
            data={data}
            online={online}
            onClose={() => setEditing(null)}
            onRefresh={onRefresh}
            onSaved={(record) => {
              gallery.accept(record);
              setNotice("Polaroid tersimpan ♡");
            }}
          />,
          document.body,
        )}
    </>
  );
}
