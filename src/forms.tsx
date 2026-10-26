import { useState } from "react";
import type { FormEvent } from "react";
import { categories, localDate, save } from "./lib";
import type { Destination, Memory, Trip } from "./lib";
import { Modal } from "./components";
type Done = {
  onClose: () => void;
  onSaved: () => Promise<void>;
  disabled: boolean;
};
function useSubmit(onSaved: () => Promise<void>, onClose: () => void) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const run = async (event: FormEvent, action: () => Promise<unknown>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await action();
      await onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run };
}
export function TripForm({
  trip,
  onClose,
  onSaved,
  disabled,
}: Done & { trip?: Trip }) {
  const { busy, error, run } = useSubmit(onSaved, onClose);
  return (
    <Modal
      title={trip ? "Edit perjalanan" : "Cerita baru dimulai"}
      onClose={onClose}
    >
      <p className="muted">Ke mana kita pergi selanjutnya?</p>
      <form
        onSubmit={(e) =>
          void run(e, async () => {
            const f = new FormData(e.currentTarget);
            const start = String(f.get("start_date")),
              end = String(f.get("end_date"));
            if (start > end)
              throw Error("Tanggal pulang harus setelah tanggal berangkat.");
            if ((Date.parse(end) - Date.parse(start)) / 86400000 > 365)
              throw Error(
                "Satu perjalanan dibatasi 366 hari. Pisahkan perjalanan lebih panjang menjadi beberapa trip.",
              );
            try {
              new Intl.DateTimeFormat("id", {
                timeZone: String(f.get("timezone")),
              });
            } catch {
              throw Error(
                "Zona waktu tidak valid. Gunakan nama IANA, misalnya Asia/Jakarta.",
              );
            }
            return save(
              "trips",
              {
                name: String(f.get("name")).trim(),
                city: String(f.get("city")).trim(),
                start_date: start,
                end_date: end,
                timezone: f.get("timezone"),
              },
              trip,
            );
          })
        }
      >
        <label>
          Nama perjalanan
          <input
            name="name"
            required
            maxLength={120}
            defaultValue={trip?.name}
            placeholder="A little escape together ♡"
          />
        </label>
        <label>
          Kota / tujuan
          <input
            name="city"
            required
            defaultValue={trip?.city}
            placeholder="Bandung, Indonesia"
          />
        </label>
        <div className="form-row">
          <label>
            Berangkat
            <input
              type="date"
              name="start_date"
              required
              defaultValue={trip?.start_date}
            />
          </label>
          <label>
            Pulang
            <input
              type="date"
              name="end_date"
              required
              defaultValue={trip?.end_date}
            />
          </label>
        </div>
        <label>
          Zona waktu
          <input
            name="timezone"
            required
            defaultValue={trip?.timezone || "Asia/Jakarta"}
          />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button disabled={busy || disabled} type="submit">
          {busy ? "Menyimpan…" : "Simpan perjalanan"}
        </button>
      </form>
    </Modal>
  );
}
export function DestinationForm({
  destination,
  trip,
  onClose,
  onSaved,
  disabled,
}: Done & { destination?: Destination; trip: Trip }) {
  const { busy, error, run } = useSubmit(onSaved, onClose);
  return (
    <Modal
      title={destination ? "Edit tempat & jadwal" : "Satu tempat, satu cerita"}
      onClose={onClose}
    >
      <p className="muted">
        {trip.name} · {trip.timezone}
      </p>
      <form
        onSubmit={(e) =>
          void run(e, async () => {
            const f = new FormData(e.currentTarget);
            const date = String(f.get("date") || "");
            if (date && (date < trip.start_date || date > trip.end_date))
              throw Error("Pilih tanggal di dalam rentang perjalanan.");
            const status = date ? String(f.get("status")) : "Wishlist";
            return save(
              "destinations",
              {
                trip_id: trip.id,
                name: String(f.get("name")).trim(),
                category: f.get("category"),
                date: date || null,
                time: date ? f.get("time") || null : null,
                tentative: f.get("tentative") === "on",
                status,
                maps_url: String(f.get("maps_url")).trim(),
                notes: f.get("notes"),
                sort_order: destination?.sort_order ?? Date.now() % 1000000000,
              },
              destination,
            );
          })
        }
      >
        <label>
          Nama tempat
          <input
            name="name"
            required
            maxLength={160}
            defaultValue={destination?.name}
          />
        </label>
        <label>
          Kategori
          <select
            name="category"
            defaultValue={destination?.category || "Food"}
          >
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <div className="form-row">
          <label>
            Tanggal
            <input
              name="date"
              type="date"
              min={trip.start_date}
              max={trip.end_date}
              defaultValue={destination?.date || ""}
            />
          </label>
          <label>
            Jam (opsional)
            <input
              name="time"
              type="time"
              defaultValue={destination?.time?.slice(0, 5) || ""}
            />
          </label>
        </div>
        <small>
          Tanpa tanggal akan masuk Wishlist. Waktu mengikuti {trip.timezone}.
        </small>
        <label className="checkbox-label">
          <input
            name="tentative"
            type="checkbox"
            defaultChecked={destination?.tentative ?? true}
          />{" "}
          Jadwal tentatif
        </label>
        <label>
          Status
          <select
            name="status"
            defaultValue={destination?.status || "Scheduled"}
          >
            {["Wishlist", "Scheduled", "Visited", "Skipped"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Link Google Maps
          <input
            name="maps_url"
            type="url"
            pattern="https://(www\.)?(google\.com/maps|maps\.google\.com|maps\.app\.goo\.gl|goo\.gl/maps)(/|\?|$).*"
            placeholder="https://maps.app.goo.gl/…"
            defaultValue={destination?.maps_url}
          />
        </label>
        <label>
          Catatan
          <textarea name="notes" rows={3} defaultValue={destination?.notes} />
        </label>
        {destination && (
          <small>
            Dibuat oleh dan editor terakhir dapat dilihat pada kartu tempat.
          </small>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button disabled={busy || disabled} type="submit">
          {busy ? "Menyimpan…" : "Simpan tempat"}
        </button>
      </form>
    </Modal>
  );
}
export function MemoryForm({
  memory,
  trip,
  trips,
  destinations,
  destinationId,
  onClose,
  onSaved,
  disabled,
}: Done & {
  memory?: Memory;
  trip?: Trip;
  trips: Trip[];
  destinations: Destination[];
  destinationId?: string;
}) {
  const { busy, error, run } = useSubmit(onSaved, onClose);
  const [tripId, setTripId] = useState(
    memory ? memory.trip_id || "" : trip?.id || "",
  );
  const [placeId, setPlaceId] = useState(
    memory?.destination_id || destinationId || "",
  );
  const selectedTrip = trips.find((t) => t.id === tripId);
  return (
    <Modal
      title={memory ? "Edit kenangan" : "Simpan momen kecil kita"}
      onClose={onClose}
    >
      <p className="muted">Ceritakan dulu, lalu tambahkan foto ke album.</p>
      <form
        onSubmit={(e) =>
          void run(e, () => {
            const f = new FormData(e.currentTarget);
            return save(
              "memories",
              {
                trip_id: tripId || null,
                destination_id: tripId ? placeId || null : null,
                location: String(f.get("location") || "").trim(),
                title: String(f.get("title")).trim(),
                story: f.get("story"),
                date: f.get("date"),
              },
              memory,
            );
          })
        }
      >
        <label>
          Judul
          <input
            name="title"
            required
            maxLength={160}
            defaultValue={
              memory?.title ||
              destinations.find((d) => d.id === destinationId)?.name ||
              ""
            }
          />
        </label>
        <label>
          Lokasi album
          <input
            name="location"
            maxLength={200}
            defaultValue={memory?.location || ""}
            placeholder="Contoh: Bogor, taman kota, atau rumah"
          />
        </label>
        <label>
          Perjalanan (opsional)
          <select
            name="trip_id"
            value={tripId}
            onChange={(e) => {
              setTripId(e.target.value);
              setPlaceId("");
            }}
          >
            <option value="">Tanpa perjalanan · album bebas</option>
            {trips
              .filter((t) => !t.deleted_at)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
          </select>
        </label>
        <small>
          Lokasi bisa diisi sendiri. Pilih tanpa perjalanan untuk foto di luar
          itinerary.
        </small>
        <label>
          Jenis kenangan
          <select
            name="destination_id"
            value={placeId}
            onChange={(e) => setPlaceId(e.target.value)}
            disabled={!tripId}
          >
            <option value="">Random moment · momen spontan</option>
            {destinations
              .filter(
                (d) =>
                  d.trip_id === tripId && (!d.deleted_at || d.id === placeId),
              )
              .map((d) => (
                <option value={d.id} key={d.id}>
                  {d.name}
                </option>
              ))}
          </select>
        </label>
        <label>
          Tanggal
          <input
            type="date"
            required
            name="date"
            defaultValue={memory?.date || localDate(selectedTrip?.timezone)}
          />
        </label>
        <label>
          Cerita kita
          <textarea
            rows={5}
            name="story"
            defaultValue={memory?.story}
            placeholder="Hal yang ingin kita ingat…"
          />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button disabled={busy || disabled} type="submit">
          {busy ? "Menyimpan…" : "Simpan kenangan"}
        </button>
      </form>
    </Modal>
  );
}
