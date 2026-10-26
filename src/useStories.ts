import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { db, empty } from "./lib";
import type { Data, Member } from "./lib";
async function loadRows<T>(table: string): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db!
      .from(table)
      .select("*")
      .order("id")
      .range(offset, offset + 999);
    if (error) throw error;
    rows.push(...(data as T[]));
    if (data.length < 1000) return rows;
  }
}
export function useStories() {
  const [session, setSession] = useState<Session | null>(null),
    [data, setData] = useState<Data>(empty),
    [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(Boolean(db)),
    [error, setError] = useState(""),
    [online, setOnline] = useState(navigator.onLine),
    [live, setLive] = useState(false),
    [checked, setChecked] = useState(false);
  const epoch = useRef(0),
    requestSeq = useRef(0),
    user = useRef<string | null>(null);
  const refresh = useCallback(async () => {
    if (!db || !user.current) return;
    if (!navigator.onLine) {
      setLoading(false);
      return;
    }
    const current = epoch.current;
    const request = ++requestSeq.current;
    const isCurrent = () =>
      current === epoch.current && request === requestSeq.current;
    setError("");
    try {
      const own = await db
        .from("authorized_members")
        .select("*")
        .eq("id", user.current)
        .maybeSingle();
      if (own.error) throw own.error;
      if (!isCurrent()) return;
      setChecked(true);
      setMember(own.data);
      if (!own.data) {
        setData(empty);
        return;
      }
      const results = await Promise.all([
        loadRows<Data["trips"][number]>("trips"),
        loadRows<Data["destinations"][number]>("destinations"),
        loadRows<Data["memories"][number]>("memories"),
        loadRows<Data["photos"][number]>("memory_photos"),
        loadRows<Member>("authorized_members"),
      ]);
      if (!isCurrent()) return;
      setData({
        trips: results[0].sort((a, b) =>
          a.start_date.localeCompare(b.start_date),
        ),
        destinations: results[1].sort((a, b) => a.sort_order - b.sort_order),
        memories: results[2].sort((a, b) => b.date.localeCompare(a.date)),
        photos: results[3],
        members: results[4],
      });
    } catch (e) {
      if (isCurrent())
        setError(
          "Layanan belum dapat dihubungi. Periksa koneksi atau status proyek Supabase (mungkin dijeda). " +
            (e instanceof Error
              ? e.message
              : String((e as { message?: string }).message || e)),
        );
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, []);
  useEffect(() => {
    const on = () => {
        setOnline(true);
        void refresh();
      },
      off = () => {
        setOnline(false);
        setLive(false);
      };
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    if (!db)
      return () => {
        window.removeEventListener("online", on);
        window.removeEventListener("offline", off);
      };
    const change = (next: Session | null) => {
      epoch.current++;
      user.current = next?.user.id || null;
      setSession(next);
      setData(empty);
      setMember(null);
      setChecked(false);
      setLoading(Boolean(next));
      if (next) window.setTimeout(() => void refresh(), 0);
    };
    void db.auth.getSession().then(({ data, error }) => {
      if (error) setError(error.message);
      change(data.session);
    });
    const { data: listener } = db.auth.onAuthStateChange((event, next) => {
      if (event === "TOKEN_REFRESHED") {
        setSession(next);
        return;
      }
      change(next);
    });
    return () => {
      listener.subscription.unsubscribe();
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, [refresh]);
  useEffect(() => {
    if (!db || !member) return;
    let timer: ReturnType<typeof setTimeout>;
    const channel = db
      .channel("our-stories")
      .on("postgres_changes", { event: "*", schema: "public" }, () => {
        clearTimeout(timer);
        timer = setTimeout(() => void refresh(), 150);
      })
      .subscribe((status) => setLive(status === "SUBSCRIBED"));
    const focus = () => void refresh();
    window.addEventListener("focus", focus);
    const interval = setInterval(() => void refresh(), 60000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      window.removeEventListener("focus", focus);
      void db!.removeChannel(channel);
      setLive(false);
    };
  }, [member?.id, refresh]);
  return {
    session,
    data,
    member,
    loading,
    error,
    online,
    live,
    checked,
    refresh,
    setError,
  };
}
