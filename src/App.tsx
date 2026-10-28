import { useEffect, useState } from "react";
import { Link, NavLink, Route, Routes, useParams } from "react-router-dom";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Archive,
  BookHeart,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  Coffee,
  Compass,
  Download,
  Edit3,
  Heart,
  Home,
  LogOut,
  MapPin,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  Undo2,
  WifiOff,
} from "lucide-react";
import {
  configured,
  dates,
  db,
  download,
  fmt,
  localDate,
  progress,
  save,
  tripStatus,
} from "./lib";
import type { Data, Destination, Memory, Photo, RecordBase, Trip } from "./lib";
import { useStories } from "./useStories";
import { Modal, PrivateImage, Upload } from "./components";
import { DestinationForm, MemoryForm, TripForm } from "./forms";
import { visibleMemories, memoryLocation } from "./memories";
import { imageExtension } from "./images";
import { PolaroidGallery } from "./polaroids/PolaroidGallery";
import { Reminders } from "./reminders/Reminders";
import { ThemePicker } from "./ThemePicker";
import { BannerBackdrop } from "./BannerBackdrop";

type Store = ReturnType<typeof useStories>;
type EditState =
  | { kind: "trip"; trip?: Trip }
  | { kind: "destination"; trip: Trip; destination?: Destination }
  | { kind: "memory"; trip?: Trip; memory?: Memory; destinationId?: string }
  | null;
type ConfirmState = { table: string; row: RecordBase; label: string } | null;
function App() {
  const store = useStories();
  const [edit, setEdit] = useState<EditState>(null),
    [remove, setRemove] = useState<ConfirmState>(null),
    [unlocked, setUnlocked] = useState<Destination | null>(null),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const blocked = !store.online || busy;
  const action = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    store.setError("");
    setNotice("");
    try {
      await fn();
      await store.refresh();
      setNotice("Tersimpan ?");
      return true;
    } catch (e) {
      await store.refresh();
      store.setError(
        e instanceof Error ? e.message : (e as { message: string }).message,
      );
      return false;
    } finally {
      setBusy(false);
    }
  };
  const mutate = async (table: string, row: RecordBase, value: object) =>
    action(() => save(table, value, row));
  const visit = async (d: Destination) => {
    if (
      await mutate("destinations", d, {
        status:
          d.status === "Visited"
            ? d.date
              ? "Scheduled"
              : "Wishlist"
            : "Visited",
      })
    ) {
      if (d.status !== "Visited") setUnlocked(d);
    }
  };
  const deletion = async () => {
    if (
      remove &&
      (await mutate(remove.table, remove.row, {
        deleted_at: new Date().toISOString(),
      }))
    )
      setRemove(null);
  };
  if (!configured) return <Welcome setup />;
  if (store.loading)
    return (
      <div className="center-page">
        <Heart className="pulse" size={38} />
        <p>Menyiapkan cerita kita…</p>
      </div>
    );
  if (!store.session)
    return <Welcome error={store.error} onError={store.setError} />;
  if (!store.member)
    return (
      <div className="center-page">
        <ShieldCheck size={42} />
        <h1>
          {store.checked
            ? "Ruang ini hanya untuk berdua."
            : "Belum dapat memeriksa akses"}
        </h1>
        <p>
          {store.checked
            ? "Akun ini belum terdaftar sebagai Rheno atau Fadla. Hubungi administrator untuk otorisasi UUID akun."
            : store.error || "Sambungkan internet untuk memeriksa keanggotaan."}
        </p>
        <div className="actions">
          <button onClick={() => void store.refresh()}>Coba lagi</button>
          <button className="secondary" onClick={() => void db!.auth.signOut()}>
            Keluar
          </button>
        </div>
      </div>
    );
  const tripDest = (t: Trip) =>
    store.data.destinations.filter((d) => d.trip_id === t.id && !d.deleted_at);
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link to="/" className="brand">
          <span className="brand-icon">
            <MapPin size={21} />
            <Heart size={11} />
          </span>
          <span>
            our travel
            <br />
            <strong>stories.</strong>
          </span>
        </Link>
        <div className="sidebar-note">A little world, just for us.</div>
        <nav>
          <NavLink to="/" end>
            <Home size={19} />
            Ruang Kita
          </NavLink>
          <NavLink to="/trips">
            <Compass size={19} />
            Perjalanan
          </NavLink>
          <NavLink to="/memories">
            <Camera size={19} />
            Kenangan
          </NavLink>
          <NavLink to="/settings">
            <Settings size={19} />
            Pengaturan
          </NavLink>
        </nav>
        <div className="sidebar-bottom">
          <Heart size={22} />
          <p>
            Collect moments,
            <br />
            <em>not things.</em>
          </p>
          <small>RHENO & FADLA</small>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span className="couple">
            Rheno <Heart size={13} /> Fadla{" "}
            <span className="private-label">
              <ShieldCheck size={12} /> Ruang privat kita
            </span>
          </span>
          <div className="top-actions">
            <span className={"connection " + (store.live ? "connected" : "")}>
              {store.online
                ? store.live
                  ? "Tersinkron"
                  : "Menghubungkan…"
                : "Offline"}
            </span>
            <button
              className="icon-button"
              aria-label="Segarkan data"
              onClick={() => void store.refresh()}
            >
              <RefreshCw size={17} />
            </button>
            <Link to="/settings" className="avatar" aria-label="Profil">
              {store.member.display_name[0]}
            </Link>
          </div>
        </header>
        {!store.online && (
          <div className="banner">
            <WifiOff size={17} /> Offline · data terakhir di memori perangkat.
            Edit dinonaktifkan sampai terhubung.
          </div>
        )}
        {store.error && (
          <div className="banner error" role="alert">
            {store.error}
            <button
              onClick={() => void store.refresh()}
              className="text-button"
            >
              Coba lagi
            </button>
          </div>
        )}
        {notice && (
          <div role="status" className="toast" onClick={() => setNotice("")}>
            {notice}
          </div>
        )}
        <main>
          <Routes>
            <Route
              path="/"
              element={
                <Dashboard
                  store={store}
                  create={() => setEdit({ kind: "trip" })}
                  tripDest={tripDest}
                />
              }
            />
            <Route
              path="/trips"
              element={
                <Trips
                  store={store}
                  onEdit={(t) => setEdit({ kind: "trip", trip: t })}
                  onDelete={(t) =>
                    setRemove({ table: "trips", row: t, label: t.name })
                  }
                  onArchive={(t) =>
                    void mutate("trips", t, { archived: !t.archived })
                  }
                  create={() => setEdit({ kind: "trip" })}
                  disabled={blocked}
                />
              }
            />
            <Route
              path="/trips/:id"
              element={
                <TripDetail
                  store={store}
                  disabled={blocked}
                  editTrip={(t) => setEdit({ kind: "trip", trip: t })}
                  editDestination={(t, d) =>
                    setEdit({ kind: "destination", trip: t, destination: d })
                  }
                  onDelete={(d) =>
                    setRemove({ table: "destinations", row: d, label: d.name })
                  }
                  onVisit={(d) => void visit(d)}
                  mutate={mutate}
                  addMemory={(t, d) =>
                    setEdit({ kind: "memory", trip: t, destinationId: d?.id })
                  }
                />
              }
            />
            <Route
              path="/memories"
              element={
                <Memories
                  store={store}
                  disabled={blocked}
                  onEdit={(t, m) =>
                    setEdit({ kind: "memory", trip: t, memory: m })
                  }
                  onDelete={(m) =>
                    setRemove({ table: "memories", row: m, label: m.title })
                  }
                  action={action}
                />
              }
            />
            <Route
              path="/settings"
              element={
                <Preferences store={store} disabled={blocked} mutate={mutate} />
              }
            />
            <Route
              path="*"
              element={
                <Empty
                  title="Halaman belum ditemukan"
                  text="Kembali ke ruang kecil kita."
                />
              }
            />
          </Routes>
          <footer>
            Made for our little adventures <Heart size={11} /> Rheno & Fadla
          </footer>
        </main>
      </div>
      {edit?.kind === "trip" && (
        <TripForm
          trip={edit.trip}
          disabled={blocked}
          onClose={() => setEdit(null)}
          onSaved={store.refresh}
        />
      )}
      {edit?.kind === "destination" && (
        <DestinationForm
          trip={edit.trip}
          destination={edit.destination}
          disabled={blocked}
          onClose={() => setEdit(null)}
          onSaved={store.refresh}
        />
      )}
      {edit?.kind === "memory" && (
        <MemoryForm
          trip={edit.trip}
          memory={edit.memory}
          trips={store.data.trips}
          destinationId={edit.destinationId}
          destinations={store.data.destinations}
          disabled={blocked}
          onClose={() => setEdit(null)}
          onSaved={store.refresh}
        />
      )}
      {remove && (
        <Modal title="Pindahkan ke sampah?" onClose={() => setRemove(null)}>
          <p>
            “{remove.label}” akan disembunyikan. Pulihkan kapan saja melalui
            Pengaturan → Sampah. Foto dan kenangan tetap disimpan secara privat.
          </p>
          <div className="actions">
            <button className="secondary" onClick={() => setRemove(null)}>
              Batal
            </button>
            <button
              className="danger"
              disabled={blocked}
              onClick={() => void deletion()}
            >
              Pindahkan ke sampah
            </button>
          </div>
        </Modal>
      )}
      {unlocked && (
        <Modal title="Memory Unlocked ♡" onClose={() => setUnlocked(null)}>
          <div className="unlocked">
            <Sparkles size={42} />
            <h3>Satu tempat, kenangan baru.</h3>
            <p>
              {unlocked.name} sudah ditandai dikunjungi dan tersimpan. Tambahkan
              cerita dan foto sekarang, atau nanti.
            </p>
          </div>
          <button
            onClick={() => {
              setEdit({
                kind: "memory",
                trip: store.data.trips.find((t) => t.id === unlocked.trip_id)!,
                destinationId: unlocked.id,
              });
              setUnlocked(null);
            }}
          >
            Simpan kenangan
          </button>
          <button className="text-button" onClick={() => setUnlocked(null)}>
            Lewati dulu
          </button>
        </Modal>
      )}
    </div>
  );
}
function Welcome({
  setup = false,
  error = "",
  onError,
}: {
  setup?: boolean;
  error?: string;
  onError?: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const login = async () => {
    setBusy(true);
    const { error } = await db!.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + import.meta.env.BASE_URL,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) {
      onError?.(error.message);
      setBusy(false);
    }
  };
  return (
    <div className="welcome">
      <div className="welcome-art">
        <div className="eyebrow">OUR TRAVEL STORIES</div>
        <div className="paper-stamp">
          <MapPin size={80} />
          <Heart size={32} />
          <span>
            THE WORLD IS BETTER
            <br />
            WITH YOU.
          </span>
        </div>
        <h2>
          Some places become
          <br />
          <em>part of our story.</em>
        </h2>
        <p>Rheno ♡ Fadla</p>
        <div className="route-line">
          ANYWHERE <span>· · · · ♡ · · · ·</span> TOGETHER
        </div>
      </div>
      <section className="welcome-content">
        <span className="eyebrow">A LITTLE WORLD, JUST FOR US</span>
        <h1>
          Our travel
          <br />
          <em>stories.</em>
        </h1>
        <p>
          Tempat menyusun rencana, menemukan sudut baru, dan menyimpan hal-hal
          kecil yang berarti.
        </p>
        {setup ? (
          <div className="setup-box">
            <ShieldCheck size={22} />
            <h3>Ruang kita hampir siap.</h3>
            <p>
              Konfigurasikan Supabase di <code>.env.local</code>, jalankan
              migrasi, dan daftarkan dua anggota. Panduan lengkap ada di{" "}
              <code>README.md</code>.
            </p>
            <small>
              Belum ada koneksi cloud. Login dan data privat tersedia setelah
              konfigurasi.
            </small>
          </div>
        ) : (
          <>
            <button
              className="google-button"
              disabled={busy || !navigator.onLine}
              onClick={() => void login()}
            >
              <span className="google-g">G</span>
              {busy ? "Menghubungkan…" : "Lanjutkan dengan Google"}
              <ArrowRight size={17} />
            </button>
            <small>
              <ShieldCheck size={13} /> Hanya untuk dua akun yang telah
              diizinkan.
            </small>
          </>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="welcome-signature">
          Every journey is sweeter with you. ♡
        </div>
      </section>
    </div>
  );
}
function Empty({
  title,
  text,
  children,
}: {
  title: string;
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <MapPin size={34} />
      <h3>{title}</h3>
      <p>{text}</p>
      {children}
    </div>
  );
}
function Heading({
  eyebrow,
  title,
  text,
  children,
}: {
  eyebrow: string;
  title: string;
  text?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {text && <p>{text}</p>}
      </div>
      {children}
    </div>
  );
}
function Progress({ value }: { value: number }) {
  return (
    <div className="progress-wrap">
      <div className="progress-label">
        <span>Little steps, lovely memories</span>
        <b>{value}%</b>
      </div>
      <div className="progress-track">
        <div style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
function TripCard({ trip, data }: { trip: Trip; data: Data }) {
  const ds = data.destinations.filter(
    (d) => d.trip_id === trip.id && !d.deleted_at,
  );
  return (
    <Link to={"/trips/" + trip.id} className="trip-card">
      <div className="trip-cover">
        <PrivateImage path={trip.cover_path} alt={trip.city} />
        <span className="pill">{tripStatus(trip)}</span>
        <span className="cover-caption">let's get a little lost.</span>
      </div>
      <div className="trip-card-body">
        <small>
          <MapPin size={13} />
          {trip.city}
        </small>
        <h3>
          {trip.name}
          <ArrowRight size={19} />
        </h3>
        <p>
          <CalendarDays size={14} />
          {fmt(trip.start_date)} — {fmt(trip.end_date)}
        </p>
        <div className="trip-bottom">
          <span>{ds.length} tempat untuk dijelajahi</span>
          <span>
            {progress(ds)}% <CheckCircle2 size={13} />
          </span>
        </div>
      </div>
    </Link>
  );
}
function Dashboard({
  store,
  create,
  tripDest,
}: {
  store: Store;
  create: () => void;
  tripDest: (t: Trip) => Destination[];
}) {
  const [, tick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => tick((x) => x + 1), 60000);
    return () => clearInterval(timer);
  }, []);
  const trips = store.data.trips.filter((t) => !t.deleted_at && !t.archived);
  const next =
    trips.find((t) => tripStatus(t) === "Ongoing") ||
    trips
      .filter((t) => tripStatus(t) === "Upcoming")
      .sort((a, b) => a.start_date.localeCompare(b.start_date))[0] ||
    trips.sort((a, b) => b.end_date.localeCompare(a.end_date))[0];
  const today = next
    ? tripDest(next).filter((d) => d.date === localDate(next.timezone))
    : [];
  const allMemories = visibleMemories(store.data.memories, store.data.trips);
  const days = next
    ? Math.max(
        0,
        Math.round(
          (Date.parse(next.start_date + "T00:00:00Z") -
            Date.parse(localDate(next.timezone) + "T00:00:00Z")) /
            86400000,
        ),
      )
    : 0;
  return (
    <>
      <Heading
        eyebrow="OUR LITTLE CORNER OF THE WORLD"
        title={`Halo, ${store.member!.display_name} ♡`}
        text="Perjalanan terbaik adalah yang kita jalani bersama."
      >
        <button disabled={!store.online} onClick={create}>
          <Plus size={17} /> Rencanakan perjalanan
        </button>
      </Heading>
      <Reminders
        compact
        trips={store.data.trips}
        memberId={store.member!.id}
        online={store.online}
      />
      <section className="dashboard-hero">
        <BannerBackdrop />
        <div className="hero-copy">
          <span className="eyebrow">RHENO & FADLA · OUR TRAVEL DIARY</span>
          <h2>
            More places.
            <br />
            More memories.
            <br />
            <em>More us.</em>
          </h2>
          <p>
            Dari rencana sederhana menjadi cerita
            <br />
            yang ingin kita ingat selamanya.
          </p>
          <Link to="/trips" className="button light">
            Jelajahi perjalanan kita <ArrowRight size={16} />
          </Link>
          <div className="hero-bottom">
            <span>EST. OUR FIRST ADVENTURE</span>
            <Heart size={17} />
          </div>
        </div>
        <div className="hero-art">
          <PolaroidGallery
            data={store.data}
            memberId={store.member!.id}
            online={store.online}
            onRefresh={store.refresh}
          />
          <span className="tape" />
          <div className="postmark">
            <Compass size={34} />
            <span>
              LET'S GO
              <br />
              SOMEWHERE
            </span>
          </div>
          <span className="hand-heart">♡</span>
        </div>
      </section>
      <div className="stat-grid">
        <div>
          <span className="stat-icon sage">
            <Compass size={20} />
          </span>
          <strong>{trips.length}</strong>
          <span>perjalanan kita</span>
        </div>
        <div>
          <span className="stat-icon blush">
            <MapPin size={20} />
          </span>
          <strong>
            {
              store.data.destinations.filter(
                (d) =>
                  !d.deleted_at &&
                  d.status === "Visited" &&
                  trips.some((t) => t.id === d.trip_id),
              ).length
            }
          </strong>
          <span>tempat dikunjungi</span>
        </div>
        <div>
          <span className="stat-icon sand">
            <Camera size={20} />
          </span>
          <strong>{allMemories.length}</strong>
          <span>kenangan tersimpan</span>
        </div>
      </div>
      <div className="dashboard-columns">
        <section>
          <div className="section-heading">
            <h2>
              {next && tripStatus(next) === "Completed"
                ? "Cerita terakhir"
                : "Petualangan selanjutnya"}
            </h2>
            <Link to="/trips">
              Semua perjalanan <ArrowRight size={14} />
            </Link>
          </div>
          {next ? (
            <>
              <TripCard trip={next} data={store.data} />
              <div className="countdown">
                <CalendarDays size={23} />
                <div>
                  <strong>
                    {tripStatus(next) === "Ongoing"
                      ? "Petualangan kita sedang berlangsung"
                      : tripStatus(next) === "Completed"
                        ? "Sampai perjalanan berikutnya ♡"
                        : `${days} hari menuju cerita baru`}
                  </strong>
                  <small>
                    {next.timezone} · {fmt(next.start_date)}
                  </small>
                </div>
                <Heart size={19} />
              </div>
              <Progress value={progress(tripDest(next))} />
            </>
          ) : (
            <Empty
              title="Ke mana kita selanjutnya?"
              text="Mulai satu perjalanan, simpan banyak cerita."
            >
              <button disabled={!store.online} onClick={create}>
                <Plus size={16} /> Buat perjalanan
              </button>
            </Empty>
          )}
        </section>
        <section>
          <div className="section-heading">
            <h2>Potongan cerita kita</h2>
            <Link to="/memories">
              Lihat album <ArrowRight size={14} />
            </Link>
          </div>
          {allMemories.length ? (
            <div className="mini-memories">
              {allMemories.slice(0, 2).map((m) => (
                <Link to="/memories" className="polaroid" key={m.id}>
                  <PrivateImage
                    path={
                      store.data.photos.find((p) => p.memory_id === m.id)?.path
                    }
                    alt={m.title}
                  />
                  <span>{m.title} ♡</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="memory-empty">
              <Camera size={34} />
              <h3>The best is yet to come.</h3>
              <p>
                Foto pertama, tawa pertama, dan cerita kecil kita akan tersimpan
                di sini.
              </p>
              <Link to="/memories">
                Buka album kita <ArrowRight size={14} />
              </Link>
            </div>
          )}
          <div className="quote">
            <span>“</span>
            <p>
              It doesn't matter where
              <br />
              we're going, as long as
              <br />
              <em>we're going together.</em>
            </p>
            <Heart size={17} />
          </div>
        </section>
      </div>
      {today.length > 0 && (
        <section>
          <div className="section-heading">
            <h2>Rencana hari ini</h2>
            <Link to={"/trips/" + next!.id}>
              Buka itinerary <ArrowRight size={14} />
            </Link>
          </div>
          <div className="today-list">
            {today.map((d) => (
              <div key={d.id}>
                <span>{d.time?.slice(0, 5) || "Tentatif"}</span>
                <strong>{d.name}</strong>
                <span className="pill">{d.status}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
function Trips({
  store,
  create,
  onEdit,
  onDelete,
  onArchive,
  disabled,
}: {
  store: Store;
  create: () => void;
  onEdit: (t: Trip) => void;
  onDelete: (t: Trip) => void;
  onArchive: (t: Trip) => void;
  disabled: boolean;
}) {
  const [filter, setFilter] = useState("All");
  const trips = store.data.trips.filter(
    (t) =>
      !t.deleted_at &&
      (filter === "All" ? !t.archived : tripStatus(t) === filter),
  );
  return (
    <>
      <Heading
        eyebrow="PLACES WE GO, STORIES WE KEEP"
        title="Perjalanan kita"
        text="Setiap tujuan punya cerita. Mari tulis cerita berikutnya."
      >
        <button disabled={disabled} onClick={create}>
          <Plus size={17} /> Perjalanan baru
        </button>
      </Heading>
      <div className="tabs">
        {["All", "Upcoming", "Ongoing", "Completed", "Archived"].map((s) => (
          <button
            key={s}
            className={filter === s ? "active" : ""}
            onClick={() => setFilter(s)}
          >
            {s === "All" ? "Semua" : s}
          </button>
        ))}
      </div>
      {!trips.length ? (
        <Empty
          title="Belum ada perjalanan di sini"
          text="Satu rencana kecil bisa jadi kenangan besar."
        />
      ) : (
        <div className="trips-grid">
          {trips.map((t) => (
            <div key={t.id}>
              <TripCard trip={t} data={store.data} />
              <div className="card-controls">
                <button
                  disabled={disabled}
                  className="text-button"
                  onClick={() => onEdit(t)}
                >
                  <Edit3 size={14} />
                  Edit
                </button>
                <button
                  disabled={disabled}
                  className="text-button"
                  onClick={() => onArchive(t)}
                >
                  <Archive size={14} />
                  {t.archived ? "Buka arsip" : "Arsipkan"}
                </button>
                <button
                  disabled={disabled}
                  aria-label={"Hapus " + t.name}
                  className="icon-button"
                  onClick={() => onDelete(t)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
type Mutate = (
  table: string,
  row: RecordBase,
  value: object,
) => Promise<boolean>;
function TripDetail({
  store,
  disabled,
  editTrip,
  editDestination,
  onDelete,
  onVisit,
  mutate,
  addMemory,
}: {
  store: Store;
  disabled: boolean;
  editTrip: (t: Trip) => void;
  editDestination: (t: Trip, d?: Destination) => void;
  onDelete: (d: Destination) => void;
  onVisit: (d: Destination) => void;
  mutate: Mutate;
  addMemory: (t: Trip, d?: Destination) => void;
}) {
  const { id } = useParams();
  const t = store.data.trips.find((t) => t.id === id && !t.deleted_at);
  const [day, setDay] = useState(""),
    [order, setOrder] = useState("manual"),
    [menu, setMenu] = useState<string | null>(null);
  if (!t)
    return (
      <Empty
        title="Perjalanan tidak ditemukan"
        text="Cek Sampah di Pengaturan jika perjalanan baru saja dihapus."
      />
    );
  const ds = store.data.destinations.filter(
      (d) => d.trip_id === id && !d.deleted_at,
    ),
    selected = day || t.start_date;
  const listed = ds
    .filter((d) =>
      selected === "wishlist"
        ? d.status === "Wishlist"
        : d.date === selected && d.status !== "Wishlist",
    )
    .sort((a, b) =>
      order === "time"
        ? (a.time || "99").localeCompare(b.time || "99") ||
          a.sort_order - b.sort_order
        : a.sort_order - b.sort_order,
    );
  const reorder = async (d: Destination, step: number) => {
    const index = listed.findIndex((x) => x.id === d.id);
    const neighbor = listed[index + step];
    if (!neighbor) return;
    const top = Math.min(...ds.map((x) => x.sort_order)) - 10,
      bottom = Math.max(...ds.map((x) => x.sort_order)) + 10;
    const other = listed[index + step * 2];
    const newOrder =
      step < 0
        ? other
          ? (other.sort_order + neighbor.sort_order) / 2
          : top
        : other
          ? (other.sort_order + neighbor.sort_order) / 2
          : bottom;
    await mutate("destinations", d, { sort_order: newOrder });
  };
  return (
    <>
      <Link to="/trips" className="back-link">
        <ArrowLeft size={15} /> Semua perjalanan
      </Link>
      <Heading
        eyebrow={`${t.city} · ${t.timezone}`}
        title={t.name}
        text={`${fmt(t.start_date)} — ${fmt(t.end_date)}`}
      >
        <button
          className="secondary"
          disabled={disabled}
          onClick={() => editTrip(t)}
        >
          <Edit3 size={16} />
          Edit perjalanan
        </button>
      </Heading>
      <div className="detail-cover">
        <PrivateImage path={t.cover_path} alt={t.city} />
        <div className="detail-cover-text">
          <span className="pill">{tripStatus(t)}</span>
          <h2>
            Let's make it
            <br />
            <em>a story to remember.</em>
          </h2>
        </div>
      </div>
      <Upload
        disabled={disabled}
        label="Ganti sampul perjalanan"
        onUpload={async (path) => {
          await save("trips", { cover_path: path }, t);
          await store.refresh();
        }}
      />
      <Progress value={progress(ds)} />
      <div className="section-heading">
        <h2>Our little itinerary</h2>
        <button disabled={disabled} onClick={() => editDestination(t)}>
          <Plus size={16} /> Tambah tempat
        </button>
      </div>
      <div className="date-tabs tabs">
        {dates(t.start_date, t.end_date).map((date, i) => (
          <button
            key={date}
            onClick={() => setDay(date)}
            className={selected === date ? "active" : ""}
          >
            <small>HARI {i + 1}</small>
            {fmt(date)}
          </button>
        ))}
        <button
          className={selected === "wishlist" ? "active" : ""}
          onClick={() => setDay("wishlist")}
        >
          <Heart size={14} /> Wishlist
        </button>
      </div>
      <div className="sort-row">
        <span>
          {listed.length} tempat · waktu lokal {t.timezone}
        </span>
        <label>
          Urutan{" "}
          <select
            aria-label="Urutan itinerary"
            value={order}
            onChange={(e) => setOrder(e.target.value)}
          >
            <option value="manual">Manual</option>
            <option value="time">Waktu</option>
          </select>
        </label>
      </div>
      {!listed.length ? (
        <Empty
          title={
            selected === "wishlist"
              ? "Tempat yang ingin kita datangi"
              : "Hari ini masih jadi halaman kosong"
          }
          text="Tambahkan tempat favorit atau aktivitas opsional seperti check-in hotel."
        />
      ) : (
        <div className="timeline">
          {listed.map((d, i) => (
            <article
              className={
                "destination " + (d.status === "Visited" ? "visited" : "")
              }
              key={d.id}
            >
              <div className="timeline-time">
                {d.time?.slice(0, 5) || "—"}
                <small>{d.tentative ? "Tentatif" : "Dikonfirmasi"}</small>
              </div>
              <div className="destination-card">
                <div className="destination-main">
                  <span className="category-icon">
                    {d.category === "Coffee" ? (
                      <Coffee size={23} />
                    ) : (
                      <MapPin size={23} />
                    )}
                  </span>
                  <div className="destination-info">
                    <small>
                      {d.category} · <span>{d.status}</span>
                    </small>
                    <h3>{d.name}</h3>
                    {d.notes && <p>{d.notes}</p>}
                    <small>
                      Dibuat:{" "}
                      {store.data.members.find((m) => m.id === d.created_by)
                        ?.display_name || "Setup awal"}{" "}
                      · Diedit:{" "}
                      {store.data.members.find((m) => m.id === d.updated_by)
                        ?.display_name || "Setup awal"}
                    </small>
                  </div>
                  <button
                    className="icon-button"
                    aria-label={"Opsi " + d.name}
                    aria-expanded={menu === d.id}
                    onClick={() => setMenu(menu === d.id ? null : d.id)}
                  >
                    <MoreHorizontal size={20} />
                  </button>
                </div>
                {d.photo_path && (
                  <PrivateImage
                    className="destination-photo"
                    path={d.photo_path}
                    alt={d.name}
                  />
                )}
                <div className="destination-actions">
                  <button
                    className={
                      "check-button " +
                      (d.status === "Visited" ? "checked" : "")
                    }
                    disabled={disabled}
                    onClick={() => onVisit(d)}
                  >
                    <Check size={15} />
                    {d.status === "Visited"
                      ? "Sudah dikunjungi · batalkan"
                      : "Tandai dikunjungi"}
                  </button>
                  {d.maps_url && (
                    <a
                      href={d.maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MapPin size={14} />
                      Maps
                    </a>
                  )}
                  <button
                    className="text-button"
                    disabled={disabled}
                    onClick={() => addMemory(t, d)}
                  >
                    <Camera size={14} />
                    Kenangan
                  </button>
                </div>
                {menu === d.id && (
                  <div className="destination-menu">
                    <button
                      className="secondary"
                      disabled={disabled}
                      onClick={() => editDestination(t, d)}
                    >
                      <Edit3 size={14} />
                      Edit / pindah hari
                    </button>
                    <button
                      className="secondary"
                      disabled={disabled}
                      onClick={() =>
                        void mutate("destinations", d, {
                          status:
                            d.status === "Skipped"
                              ? d.date
                                ? "Scheduled"
                                : "Wishlist"
                              : "Skipped",
                        })
                      }
                    >
                      {" "}
                      {d.status === "Skipped"
                        ? "Jadwalkan lagi"
                        : "Lewati tempat"}
                    </button>
                    <button
                      className="icon-button"
                      aria-label="Naikkan urutan"
                      disabled={disabled || order !== "manual" || i === 0}
                      onClick={() => void reorder(d, -1)}
                    >
                      <ArrowUp size={16} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label="Turunkan urutan"
                      disabled={
                        disabled ||
                        order !== "manual" ||
                        i === listed.length - 1
                      }
                      onClick={() => void reorder(d, 1)}
                    >
                      <ArrowDown size={16} />
                    </button>
                    <button
                      className="icon-button"
                      disabled={disabled}
                      aria-label={"Hapus " + d.name}
                      onClick={() => onDelete(d)}
                    >
                      <Trash2 size={15} />
                    </button>
                    <Upload
                      disabled={disabled}
                      label="Foto tempat"
                      onUpload={async (path) => {
                        await save("destinations", { photo_path: path }, d);
                        await store.refresh();
                      }}
                    />
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
function Memories({
  store,
  disabled,
  onEdit,
  onDelete,
  action,
}: {
  store: Store;
  disabled: boolean;
  onEdit: (t?: Trip, m?: Memory) => void;
  onDelete: (m: Memory) => void;
  action: (fn: () => Promise<unknown>) => Promise<boolean>;
}) {
  const [query, setQuery] = useState(""),
    [selected, setSelected] = useState<Memory | null>(null),
    [preview, setPreview] = useState<Photo | null>(null),
    [removePhoto, setRemovePhoto] = useState<Photo | null>(null),
    [caption, setCaption] = useState<Photo | null>(null);
  const ts = store.data.trips.filter((t) => !t.deleted_at),
    ms = visibleMemories(store.data.memories, ts, query);
  const album = selected
    ? store.data.memories.find((m) => m.id === selected.id && !m.deleted_at)
    : null;
  const getTrip = (m: Memory) => ts.find((t) => t.id === m.trip_id);
  const downloadPhoto = async (p: Photo) => {
    await action(async () => {
      const { data, error } = await db!.storage
        .from("memories")
        .download(p.path);
      if (error) throw error;
      download("our-memory-" + p.id + "." + imageExtension(data.type), data);
    });
  };
  return (
    <>
      <Heading
        eyebrow="THE MOMENTS BETWEEN THE MILES"
        title="Potongan cerita kita"
        text="Bukan sekadar foto. Ini perasaan yang ingin kita simpan."
      >
        <button
          disabled={disabled}
          onClick={() => {
            setQuery("");
            onEdit();
          }}
        >
          <Plus size={16} /> Kenangan baru
        </button>
      </Heading>
      <div className="sort-row">
        <span>{ms.length} cerita kecil</span>
        <input
          type="search"
          aria-label="Cari judul album"
          placeholder="Cari judul album?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ width: "min(100%, 280px)" }}
        />
      </div>
      {!ms.length ? (
        <Empty
          title={
            query.trim() ? "Album tidak ditemukan" : "Our memories start here."
          }
          text={
            query.trim()
              ? "Coba judul lain atau kosongkan pencarian untuk melihat semua album."
              : "Tulis cerita dari tempat yang dikunjungi, atau simpan momen spontan selama perjalanan."
          }
        />
      ) : (
        <div className="album-grid">
          {ms.map((m) => (
            <div className="memory-card" key={m.id}>
              <button className="polaroid" onClick={() => setSelected(m)}>
                <PrivateImage
                  path={
                    store.data.photos.find((p) => p.memory_id === m.id)?.path
                  }
                  alt={m.title}
                />
                <span>{m.title} ♡</span>
              </button>
              <small>
                {fmt(m.date)} ·{" "}
                {m.destination_id ? "Destination memory" : "Random moment"}
                {" · "}
                {memoryLocation(m, ts)}
              </small>
              <p>{m.story || "Sebuah momen milik kita."}</p>
              <div className="card-controls">
                <button
                  className="text-button"
                  disabled={disabled}
                  onClick={() => onEdit(getTrip(m), m)}
                >
                  <Edit3 size={14} />
                  Edit album
                </button>
                <button
                  className="icon-button"
                  disabled={disabled}
                  aria-label={"Hapus " + m.title}
                  onClick={() => onDelete(m)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {album && (
        <Modal title={album.title} onClose={() => setSelected(null)}>
          <p>{album.story}</p>
          <small>
            {fmt(album.date)} · {memoryLocation(album, ts)}
          </small>
          <div className="actions">
            <button
              className="text-button"
              disabled={disabled}
              onClick={() => {
                setSelected(null);
                onEdit(getTrip(album), album);
              }}
            >
              <Edit3 size={14} /> Edit lokasi & cerita
            </button>
          </div>
          <div className="photo-grid">
            {store.data.photos
              .filter((p) => p.memory_id === album.id)
              .map((p) => (
                <div key={p.id}>
                  <button
                    className="photo-button"
                    onClick={() => setPreview(p)}
                  >
                    <PrivateImage
                      path={p.path}
                      alt={p.caption || album.title}
                    />
                  </button>
                  <p>{p.caption}</p>
                  <div className="card-controls">
                    <button
                      className="icon-button"
                      aria-label="Unduh foto"
                      disabled={!store.online}
                      onClick={() => void downloadPhoto(p)}
                    >
                      <Download size={16} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label="Edit caption"
                      disabled={disabled}
                      onClick={() => setCaption(p)}
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label="Hapus foto"
                      disabled={disabled}
                      onClick={() => setRemovePhoto(p)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
          </div>
          <Upload
            disabled={disabled}
            onUpload={async (path, bytes) => {
              await save("memory_photos", { memory_id: album.id, path, bytes });
              await store.refresh();
            }}
          />
        </Modal>
      )}
      {preview && (
        <Modal title="Momen kita" onClose={() => setPreview(null)}>
          <PrivateImage
            className="photo-preview"
            path={preview.path}
            alt={preview.caption || "Foto kenangan"}
          />
          <p>{preview.caption}</p>
          <button
            onClick={() => void downloadPhoto(preview)}
            disabled={!store.online}
          >
            <Download size={16} /> Unduh salinan optimal
          </button>
        </Modal>
      )}
      {caption && (
        <Modal
          title="Catatan kecil untuk foto"
          onClose={() => setCaption(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const value = new FormData(e.currentTarget).get("caption");
              void action(() =>
                save("memory_photos", { caption: value }, caption),
              ).then((ok) => {
                if (ok) setCaption(null);
              });
            }}
          >
            <label>
              Caption
              <textarea
                name="caption"
                rows={3}
                defaultValue={caption.caption}
              />
            </label>
            <button disabled={disabled}>Simpan caption</button>
          </form>
        </Modal>
      )}
      {removePhoto && (
        <Modal
          title="Hapus foto permanen?"
          onClose={() => setRemovePhoto(null)}
        >
          <p>
            Foto ini tidak masuk Sampah. Pastikan foto asli sudah tersimpan di
            perangkat Anda.
          </p>
          <button
            className="danger"
            disabled={disabled}
            onClick={() =>
              void action(async () => {
                const row = await db!
                  .from("memory_photos")
                  .delete()
                  .eq("id", removePhoto.id)
                  .eq("version", removePhoto.version)
                  .select()
                  .single();
                if (row.error)
                  throw Error(
                    "Foto berubah di perangkat lain. Segarkan lalu ulangi.",
                  );
                const storage = await db!.storage
                  .from("memories")
                  .remove([removePhoto.path]);
                if (storage.error)
                  throw Error(
                    "Catatan foto sudah dihapus; pembersihan berkas privat gagal. Administrator perlu membersihkan berkas yatim: " +
                      removePhoto.path,
                  );
              }).then((ok) => {
                if (ok) setRemovePhoto(null);
              })
            }
          >
            Hapus foto permanen
          </button>
        </Modal>
      )}
    </>
  );
}
function Preferences({
  store,
  disabled,
  mutate,
}: {
  store: Store;
  disabled: boolean;
  mutate: Mutate;
}) {
  const [loggingOut, setLoggingOut] = useState(false);
  const d = store.data,
    photosBytes = d.photos.reduce((n, p) => n + p.bytes, 0);
  const deleted = [
    ...d.trips
      .filter((t) => t.deleted_at)
      .map((row) => ({ table: "trips", row, label: row.name })),
    ...d.destinations
      .filter((t) => t.deleted_at)
      .map((row) => ({ table: "destinations", row, label: row.name })),
    ...d.memories
      .filter((t) => t.deleted_at)
      .map((row) => ({ table: "memories", row, label: row.title })),
  ];
  const exportText = () => {
    const text = d.trips
      .filter((t) => !t.deleted_at)
      .map(
        (t) =>
          `${t.name}\n${t.city} · ${fmt(t.start_date)} – ${fmt(t.end_date)} · ${t.timezone}\n\n` +
          d.destinations
            .filter((x) => x.trip_id === t.id && !x.deleted_at)
            .sort(
              (a, b) =>
                (a.date || "9999").localeCompare(b.date || "9999") ||
                (a.time || "99").localeCompare(b.time || "99"),
            )
            .map(
              (x) =>
                `${x.date || "Wishlist"} ${x.time?.slice(0, 5) || "—"} ${x.tentative ? "(tentatif)" : ""} · ${x.name} [${x.status}]\n${x.notes}\n${x.maps_url}`,
            )
            .join("\n\n"),
      )
      .join("\n\n----------------\n\n");
    download("our-itinerary.txt", text, "text/plain;charset=utf-8");
  };
  return (
    <>
      <Heading
        eyebrow="OUR PRIVATE LITTLE SPACE"
        title="Pengaturan"
        text="Semua yang membuat ruang ini milik kita."
      />
      <Reminders
        trips={store.data.trips}
        memberId={store.member!.id}
        online={store.online}
      />
      <div className="settings-grid">
        <section className="panel">
          <div className="profile">
            <span className="avatar large">
              {store.member!.display_name[0]}
            </span>
            <div>
              <h2>{store.member!.display_name}</h2>
              <p>{store.session?.user.email}</p>
              <small>
                <ShieldCheck size={13} /> Anggota terotorisasi
              </small>
            </div>
          </div>
          <ThemePicker />
          <button
            className="secondary"
            disabled={loggingOut}
            onClick={async () => {
              setLoggingOut(true);
              const { error } = await db!.auth.signOut();
              if (error) {
                store.setError(error.message);
                setLoggingOut(false);
              } else {
                sessionStorage.clear();
              }
            }}
          >
            <LogOut size={16} /> {loggingOut ? "Keluar…" : "Keluar dari akun"}
          </button>
        </section>
        <section className="panel">
          <h2>Keep our stories safe.</h2>
          <p>Cadangkan data dan simpan foto asli secara terpisah.</p>
          <div className="storage-bar">
            <Camera size={22} />
            <div>
              <strong>{(photosBytes / 1048576).toFixed(1)} MB</strong>
              <small>
                Foto album tercatat · tidak termasuk sampul / berkas yatim. Cek
                total kuota di dashboard Supabase.
              </small>
            </div>
          </div>
          <div className="stack">
            <button
              className="secondary"
              onClick={() =>
                download(
                  "our-travel-backup.json",
                  JSON.stringify(
                    { exported_at: new Date().toISOString(), ...d },
                    null,
                    2,
                  ),
                )
              }
            >
              <Download size={16} /> Ekspor metadata JSON
            </button>
            <button className="secondary" onClick={exportText}>
              <BookHeart size={16} /> Unduh itinerary teks
            </button>
            <Link to="/memories" className="button secondary">
              <Camera size={16} /> Unduh foto satu per satu
            </Link>
          </div>
          <small>
            Ekspor mengandung data privat, tanpa token login atau URL foto
            permanen. Simpan di tempat aman. JSON merupakan arsip metadata,
            belum mendukung impor otomatis.
          </small>
        </section>
        <section className="panel">
          <h2>Take us everywhere.</h2>
          <h3>iPhone / iPad</h3>
          <p>
            Buka di Safari → Bagikan → Tambahkan ke Layar Utama. Masuk dengan
            Google di jendela aplikasi yang sama.
          </p>
          <h3>Android</h3>
          <p>
            Buka di Chrome → menu ⋮ → Instal aplikasi / Tambahkan ke layar
            utama.
          </p>
          <p>
            App shell tersedia offline. Demi privasi, data perjalanan hanya
            disimpan sementara dalam memori; setelah aplikasi ditutup perlu
            internet untuk memuat ulang.
          </p>
        </section>
        <section className="panel">
          <h2>Sampah & pemulihan</h2>
          <p>
            Catatan disimpan agar kesalahan kecil tidak menghapus cerita kita.
            Pulihkan perjalanan induk lebih dulu jika perlu.
          </p>
          {deleted.length ? (
            deleted.map((item) => (
              <div className="trash-row" key={item.row.id}>
                <div>
                  <strong>{item.label}</strong>
                  <small>{item.table}</small>
                </div>
                <button
                  className="icon-button"
                  disabled={disabled}
                  aria-label={"Pulihkan " + item.label}
                  onClick={() =>
                    void mutate(item.table, item.row, { deleted_at: null })
                  }
                >
                  <Undo2 size={17} />
                </button>
              </div>
            ))
          ) : (
            <p className="muted">Tidak ada cerita di sampah ♡</p>
          )}
        </section>
      </div>
      <p className="app-version">
        Our Travel Stories · v1.0.0 · Rheno & Fadla
        <br />
        Supabase Free + GitHub Pages. Ketersediaan mengikuti layanan gratis;
        proyek dijeda dapat diaktifkan kembali melalui dashboard Supabase.
      </p>
    </>
  );
}
export default App;
