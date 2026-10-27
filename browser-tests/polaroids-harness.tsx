// Test-only Supabase stand-in with synthetic photographs. Never imported by the production application.
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { PolaroidGallery } from "../src/polaroids/PolaroidGallery";
import { db } from "../src/lib";
import { defaultCrop, GALLERY_ID } from "../src/polaroids/model";
import type { GalleryRecord, PolaroidItem } from "../src/polaroids/model";
import type { Data, Photo } from "../src/lib";
import "../src/style.css";
const KEY = "polaroid-browser-test-store";
const memberId = "a0000000-0000-4000-8000-000000000001";
const base = {
  version: 1,
  created_by: memberId,
  updated_by: memberId,
  deleted_at: null,
};
const photoId = (n: number) =>
  `b0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const photos: Photo[] = Array.from({ length: 8 }, (_, i) => ({
  ...base,
  id: photoId(i + 1),
  memory_id: "album",
  path: `fixture/${i + 1}.png`,
  caption: `Moment ${i + 1}`,
  bytes: 100,
}));
const data: Data = {
  trips: [],
  destinations: [],
  members: [{ id: memberId, display_name: "Rheno" }],
  memories: [
    {
      ...base,
      id: "album",
      trip_id: null,
      destination_id: null,
      title: "Album Test",
      date: "2026-10-27",
      story: "Synthetic fixtures",
      location: "Somewhere",
    },
  ],
  photos,
};
const count = Number(new URLSearchParams(location.search).get("count") ?? 3);
type TestStore = { gallery: GalleryRecord; data: Data };
const seed: TestStore = {
  gallery: {
    ...base,
    id: GALLERY_ID,
    photos: photos
      .slice(0, count)
      .map((p) => ({ photo_id: p.id, caption: p.caption, ...defaultCrop })),
  },
  data,
};
let store: TestStore = JSON.parse(
  localStorage.getItem(KEY) || JSON.stringify(seed),
);
const listeners = new Set<() => void>();
const clone = <T,>(v: T): T => structuredClone(v);
const persist = () => localStorage.setItem(KEY, JSON.stringify(store));
persist();
const signal = () => listeners.forEach((fn) => fn());
window.addEventListener("storage", (e) => {
  if (e.key === KEY && e.newValue) {
    store = JSON.parse(e.newValue);
    signal();
  }
});
const harness = {
  failUploads: 0,
  failConfig: false,
  failMetadata: false,
  storageUploads: [] as { path: string; bytes: number }[],
  storageRemovals: [] as string[],
  reads: 0,
  missing: new URLSearchParams(location.search).has("missing"),
  snapshot: () => clone(store),
  remote: (items: PolaroidItem[]) => {
    store.gallery = {
      ...store.gallery,
      photos: clone(items),
      version: store.gallery.version + 1,
    };
    persist();
    signal();
  },
  dropPhoto: (id: string) => {
    store.data.photos = store.data.photos.filter((p) => p.id !== id);
    persist();
    signal();
    window.dispatchEvent(new Event("fixture-refresh"));
  },
};
declare global {
  interface Window {
    polaroidHarness: typeof harness;
  }
}
window.polaroidHarness = harness;
function records(table: string) {
  if (table === "dashboard_polaroids") return [store.gallery];
  if (table === "memories") return store.data.memories;
  if (table === "memory_photos") return store.data.photos;
  throw Error("Unexpected table " + table);
}
// Deliberately test-local. Queries/updates run against memory and localStorage in this page only.
const from = (table: string) => {
  let action = "read",
    value: Record<string, unknown> = {};
  const filters: { key: string; value: unknown }[] = [];
  const execute = () => {
    if (table === "dashboard_polaroids" && harness.missing)
      return {
        data: null,
        error: { code: "PGRST205", message: "Missing fixture table" },
      };
    const rows = records(table) as unknown as Record<string, unknown>[];
    if (action === "read") {
      harness.reads++;
      return {
        data: clone(
          rows.find((row) => filters.every((f) => row[f.key] === f.value)) ||
            null,
        ),
        error: null,
      };
    }
    if (action === "update") {
      if (harness.failConfig && table === "dashboard_polaroids")
        return {
          data: null,
          error: { message: "Pengaturan gagal disimpan (tes)." },
        };
      const row = rows.find((row) =>
        filters.every((f) => row[f.key] === f.value),
      );
      if (!row)
        return {
          data: null,
          error: { code: "PGRST116", message: "Stale version" },
        };
      Object.assign(row, clone(value), {
        version: Number(row.version) + 1,
        updated_by: memberId,
      });
      persist();
      queueMicrotask(signal);
      return { data: clone(row), error: null };
    }
    if (harness.failMetadata && table === "memory_photos")
      return {
        data: null,
        error: { message: "Metadata gagal disimpan (tes)." },
      };
    const row = { ...base, id: crypto.randomUUID(), ...clone(value) };
    rows.push(row);
    persist();
    return { data: clone(row), error: null };
  };
  const query = {
    select: () => query,
    eq: (key: string, v: unknown) => {
      filters.push({ key, value: v });
      return query;
    },
    update: (v: Record<string, unknown>) => {
      action = "update";
      value = v;
      return query;
    },
    insert: (v: Record<string, unknown>) => {
      action = "insert";
      value = v;
      return query;
    },
    maybeSingle: async () => execute(),
    single: async () => execute(),
  };
  return query;
};
db!.from = from as unknown as NonNullable<typeof db>["from"];
db!.storage.from = (() => ({
  createSignedUrl: async (path: string) => ({
    data: {
      signedUrl:
        "data:image/svg+xml," +
        encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="300"><rect width="240" height="300" fill="${["#d39ba8", "#8ea99a", "#c7ab8f"][Number(path.match(/(\d+)\.png/)?.[1] || 0) % 3]}"/><circle cx="120" cy="110" r="55" fill="#faf3ef"/><text x="120" y="220" text-anchor="middle" fill="#60474b" font-size="22">${path.match(/(\d+)\.png/)?.[1] || "new"}</text></svg>`,
        ),
    },
    error: null,
  }),
  upload: async (path: string, blob: Blob) => {
    harness.storageUploads.push({ path, bytes: blob.size });
    if (harness.failUploads > 0) {
      harness.failUploads--;
      return {
        data: null,
        error: { message: "Unggah gagal (tes).", statusCode: "503" },
      };
    }
    return { data: { path }, error: null };
  },
  remove: async (paths: string[]) => {
    harness.storageRemovals.push(...paths);
    return { data: [], error: null };
  },
})) as unknown as NonNullable<typeof db>["storage"]["from"];
db!.channel = (() => {
  let callback = () => {};
  const channel = {
    on: (_type: unknown, _filter: unknown, fn: () => void) => {
      callback = fn;
      return channel;
    },
    subscribe: (fn: (status: string) => void) => {
      listeners.add(callback);
      queueMicrotask(() => fn("SUBSCRIBED"));
      return channel;
    },
    unsubscribe: () => {
      listeners.delete(callback);
    },
  };
  return channel;
}) as unknown as NonNullable<typeof db>["channel"];
db!.removeChannel = (async (channel: { unsubscribe: () => void }) => {
  channel.unsubscribe();
  return "ok";
}) as unknown as NonNullable<typeof db>["removeChannel"];
function Fixture() {
  const [current, setData] = useState(clone(store.data)),
    [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(navigator.onLine),
      refresh = () => setData(clone(store.data));
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    window.addEventListener("fixture-refresh", refresh);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
      window.removeEventListener("fixture-refresh", refresh);
    };
  }, []);
  return (
    <main>
      <section className="dashboard-hero">
        <div className="hero-copy">
          <span className="eyebrow">OUR TRAVEL DIARY</span>
          <h2>
            More places.
            <br />
            More memories.
            <br />
            <em>More us.</em>
          </h2>
        </div>
        <div className="hero-art">
          <PolaroidGallery
            data={current}
            memberId={memberId}
            online={online}
            onRefresh={async () => setData(clone(store.data))}
          />
          <span className="tape" />
          <div className="postmark">SOMEWHERE</div>
        </div>
      </section>
    </main>
  );
}
createRoot(document.getElementById("test-root")!).render(<Fixture />);
