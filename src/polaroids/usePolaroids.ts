import { useCallback, useEffect, useRef, useState } from "react";
import { db } from "../lib";
import { errorMessage, missingGallery, readGallery } from "./api";
import type { GalleryRecord } from "./model";
export function usePolaroids(memberId: string) {
  const [record, setRecord] = useState<GalleryRecord | null>(null),
    [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">(
      "loading",
    ),
    [error, setError] = useState(""),
    [interrupted, setInterrupted] = useState(false);
  const alive = useRef(false),
    sequence = useRef(0);
  const refresh = useCallback(async () => {
    if (!alive.current) return;
    if (!navigator.onLine) {
      setStatus("error");
      setError("Sedang offline. Sambungkan internet untuk memuat galeri.");
      return;
    }
    const request = ++sequence.current;
    try {
      const next = await readGallery();
      if (alive.current && request === sequence.current) {
        setRecord(next);
        setStatus("ready");
        setError("");
      }
    } catch (e) {
      if (alive.current && request === sequence.current) {
        setStatus(missingGallery(e) ? "missing" : "error");
        setError(
          missingGallery(e)
            ? "Galeri dashboard belum diaktifkan."
            : errorMessage(e),
        );
      }
    }
  }, []);
  useEffect(() => {
    if (!memberId || !db) return;
    alive.current = true;
    void refresh();
    const recover = () => void refresh();
    window.addEventListener("online", recover);
    window.addEventListener("focus", recover);
    const channel = db
      .channel("dashboard-polaroids")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dashboard_polaroids" },
        recover,
      )
      .subscribe((value) => {
        if (!alive.current) return;
        setInterrupted(value !== "SUBSCRIBED");
        if (value === "SUBSCRIBED") void refresh();
      });
    return () => {
      alive.current = false;
      sequence.current++;
      window.removeEventListener("online", recover);
      window.removeEventListener("focus", recover);
      void db!.removeChannel(channel);
    };
  }, [memberId, refresh]);
  const accept = useCallback((next: GalleryRecord) => {
    sequence.current++;
    setRecord(next);
    setStatus("ready");
    setError("");
  }, []);
  return { record, status, error, interrupted, refresh, accept };
}
