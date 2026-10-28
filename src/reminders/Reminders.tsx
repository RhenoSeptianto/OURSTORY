import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarDays, Edit3, Plus, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Modal } from "../components";
import { db, download, fmt, localDate, save } from "../lib";
import type { Trip } from "../lib";
import { calendarFile, googleCalendar, upcoming } from "./model";
import type { CalendarEvent, SpecialDay } from "./model";
import "./reminders.css";

export function Reminders({
  trips,
  memberId,
  online,
  compact = false,
}: {
  trips: Trip[];
  memberId: string;
  online: boolean;
  compact?: boolean;
}) {
  const [rows, setRows] = useState<SpecialDay[]>([]);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [missing, setMissing] = useState(false);
  const [edit, setEdit] = useState<SpecialDay | "new" | null>(null);
  const [remove, setRemove] = useState<SpecialDay | null>(null);
  const [calendar, setCalendar] = useState<CalendarEvent | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [, tick] = useState(0);
  const sequence = useRef(0);
  const refresh = useCallback(async () => {
    if (!db || !navigator.onLine) return;
    const request = ++sequence.current;
    try {
      const result: SpecialDay[] = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await db
          .from("special_days")
          .select("*")
          .order("id")
          .range(offset, offset + 999);
        if (error) throw error;
        result.push(...(data as SpecialDay[]));
        if (data.length < 1000) break;
      }
      if (request !== sequence.current) return;
      setRows(result);
      setReady(true);
      setMissing(false);
      setError("");
    } catch (e) {
      if (request !== sequence.current) return;
      const failure = e as { code?: string; message?: string };
      const absent = failure.code === "42P01" || failure.code === "PGRST205";
      setMissing(absent);
      setReady(false);
      setError(
        absent
          ? "Hari spesial belum diaktifkan. Jalankan SQL 004_special_days di Supabase terlebih dahulu."
          : "Pengingat belum dapat dimuat. Coba lagi saat koneksi tersedia.",
      );
    }
  }, []);
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => {
      tick((n) => n + 1);
      void refresh();
    }, 60000);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    const channel = db
      ?.channel(compact ? "special-days-banner" : "special-days-settings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "special_days" },
        () => void refresh(),
      )
      .subscribe();
    return () => {
      sequence.current++;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      if (channel) void db!.removeChannel(channel);
    };
  }, [memberId, refresh, compact]);
  const events = upcoming(rows, trips);
  if (compact) {
    const nearby = events.filter((event) => event.days <= 7 && !event.started);
    const next = nearby[0];
    if (!next) return null;
    return (
      <Link
        className="reminder-banner"
        to="/settings"
        aria-label={`${next.title} · ${next.days === 0 ? "Hari ini" : `${next.days} hari lagi`}. Lihat tanggal penting di Pengaturan`}
      >
        <span aria-hidden="true">♡</span>
        <span className="reminder-banner-title">{next.title}</span>
        <span className="reminder-banner-time">
          {next.days === 0 ? "Hari ini" : `${next.days} hari lagi`}
        </span>
        {nearby.length > 1 && <small>+{nearby.length - 1}</small>}
      </Link>
    );
  }
  const commit = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
      setEdit(null);
      setRemove(null);
      await refresh();
      setNotice(
        "Tersimpan. Jika sudah ditambahkan ke kalender, perbarui juga acara di sana.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section
      className="reminders"
      aria-label="Tanggal penting"
      id="tanggal-penting"
    >
      <div className="section-heading">
        <div>
          <span className="eyebrow">DATES TO REMEMBER</span>
          <h2>Tanggal penting</h2>
        </div>
        <button
          className="secondary"
          disabled={!online || !ready || busy}
          onClick={() => setEdit("new")}
        >
          <Plus size={16} /> Hari spesial
        </button>
      </div>
      <p>
        Simpan ulang tahun Rheno, ulang tahun Fadla, dan tanggal mulai hubungan.
        Hari spesial dan anniversary berulang setiap tahun. Rencana perjalanan
        mengikuti tanggal keberangkatan.
      </p>
      {error && (
        <div role="alert">
          {error}{" "}
          <button
            className="secondary"
            disabled={!online || busy}
            onClick={() => void refresh()}
          >
            Coba lagi
          </button>
        </div>
      )}
      {!online && (
        <p role="status">
          Sedang offline. Data terakhir mungkin belum diperbarui.
        </p>
      )}
      {!ready && !error && <p role="status">Memuat hari spesial…</p>}
      {notice && <p role="status">{notice}</p>}
      {!events.length && (
        <p>
          {missing
            ? "Pengingat perjalanan tetap tersedia ketika kalian membuat rencana."
            : "Simpan tanggal penting pertama kalian, atau rencanakan perjalanan baru."}
        </p>
      )}
      <div className="reminder-list">
        {events.map((event) => (
          <article key={event.id}>
            <CalendarDays size={22} aria-hidden="true" />
            <div className="reminder-copy">
              <h3>{event.title}</h3>
              <p>
                {fmt(event.date)}
                {event.end !== event.date ? ` – ${fmt(event.end)}` : ""}
                {event.annual ? " · Setiap tahun" : ""}
              </p>
              <strong>
                {event.days === 0
                  ? event.date < localDate()
                    ? "Sedang berlangsung"
                    : "Hari ini ♡"
                  : `${event.days} hari lagi`}
                {event.anniversary !== null && event.anniversary > 0
                  ? ` · Anniversary ke-${event.anniversary}`
                  : ""}
              </strong>
            </div>
            <div className="reminder-actions">
              <button className="secondary" onClick={() => setCalendar(event)}>
                Tambahkan ke kalender
              </button>
              {event.source && (
                <>
                  <button
                    className="icon-button"
                    aria-label={`Ubah ${event.title}`}
                    disabled={!online || !ready || busy}
                    onClick={() => setEdit(event.source!)}
                  >
                    <Edit3 size={17} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Hapus ${event.title}`}
                    disabled={!online || !ready || busy}
                    onClick={() => setRemove(event.source!)}
                  >
                    <Trash2 size={17} />
                  </button>
                </>
              )}
            </div>
          </article>
        ))}
      </div>
      {edit && (
        <SpecialForm
          row={edit === "new" ? undefined : edit}
          busy={busy || !online}
          error={error}
          onClose={() => {
            if (!busy) setEdit(null);
          }}
          onSave={(value) =>
            void commit(() =>
              save("special_days", value, edit === "new" ? undefined : edit),
            )
          }
        />
      )}
      {remove && (
        <Modal
          title="Hapus hari spesial?"
          onClose={() => {
            if (!busy) setRemove(null);
          }}
        >
          <p>
            Hapus “{remove.title}” dari Ourstory? Acara yang sudah ada di
            kalender HP perlu dihapus sendiri.
          </p>
          {error && <p role="alert">{error}</p>}
          <button
            disabled={busy || !online}
            onClick={() =>
              void commit(() =>
                save(
                  "special_days",
                  { deleted_at: new Date().toISOString() },
                  remove,
                ),
              )
            }
          >
            {busy ? "Menghapus…" : "Hapus hari spesial"}
          </button>
        </Modal>
      )}
      {calendar && (
        <Modal title="Tambahkan ke kalender" onClose={() => setCalendar(null)}>
          <p>
            <strong>{calendar.title}</strong> · {fmt(calendar.date)}
          </p>
          <p>
            {calendar.annual
              ? "Berulang setiap tahun. Pengingat file kalender: H-7 dan hari H, pukul 09.00."
              : "Pengingat file kalender: H-7 dan H-1 sebelum berangkat, pukul 09.00."}
          </p>
          <div className="reminder-calendar">
            <a
              className="button"
              href={googleCalendar(calendar)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Calendar
            </a>
            <button
              className="secondary"
              onClick={() =>
                download(
                  "ourstory-pengingat.ics",
                  calendarFile(calendar),
                  "text/calendar;charset=utf-8",
                )
              }
            >
              Kalender iPhone / file .ics
            </button>
          </div>
          <p>
            Google Calendar: atur pengingat sebelum menyimpan. iPhone: buka file
            .ics lalu tambahkan ke kalender. Jika tidak ada pilihan impor,
            gunakan Google Calendar atau buka file melalui Kalender di Mac.
          </p>
          <p>
            Aktifkan notifikasi Kalender di HP. Waktu dan dukungan pengingat
            mengikuti aplikasi kalender. Ini salinan acara; perubahan atau
            penghapusan di Ourstory perlu diperbarui manual. Hindari menambahkan
            acara yang sama berulang kali.
          </p>
          {calendar.source?.date.slice(5) === "02-29" && (
            <p>Tanggal 29 Februari diperingati pada hari terakhir Februari.</p>
          )}
        </Modal>
      )}
    </section>
  );
}
function SpecialForm({
  row,
  busy,
  error,
  onSave,
  onClose,
}: {
  row?: SpecialDay;
  busy: boolean;
  error: string;
  onSave: (value: {
    title: string;
    kind: SpecialDay["kind"];
    date: string;
  }) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(row?.title || "");
  const [kind, setKind] = useState<SpecialDay["kind"]>(row?.kind || "special");
  const [date, setDate] = useState(row?.date || localDate());
  return (
    <Modal
      title={row ? "Ubah hari spesial" : "Hari spesial kita"}
      onClose={onClose}
    >
      <form
        className="reminder-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy && title.trim())
            onSave({ title: title.trim(), kind, date });
        }}
      >
        <label>
          Judul
          <input
            required
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: Ulang tahun Fadla"
          />
        </label>
        <label>
          Jenis
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as SpecialDay["kind"])}
          >
            <option value="special">Hari spesial / ulang tahun</option>
            <option value="anniversary">Anniversary hubungan</option>
          </select>
        </label>
        <label>
          {kind === "anniversary"
            ? "Tanggal mulai hubungan"
            : "Tanggal hari spesial"}
          <input
            type="date"
            required
            min="1900-01-01"
            max="2200-12-31"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <p>
          Disimpan untuk kalian berdua dan berulang setiap tahun.
          {kind === "anniversary"
            ? " Isi tanggal awal hubungan agar hitungan tahunnya tepat."
            : ""}
        </p>
        {error && <p role="alert">{error}</p>}
        <button disabled={busy || !title.trim()} type="submit">
          {busy ? "Menyimpan…" : "Simpan hari spesial"}
        </button>
      </form>
    </Modal>
  );
}
