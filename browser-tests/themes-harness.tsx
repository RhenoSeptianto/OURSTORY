import { useState } from "react";
import { createRoot } from "react-dom/client";
import { ThemePicker } from "../src/ThemePicker";
import { applyTheme, readTheme } from "../src/themes";
import { Modal } from "../src/components";
import "../src/style.css";
import "../src/polaroids/polaroids.css";
import "../src/reminders/reminders.css";
import "../src/themes.css";
applyTheme(readTheme());
function Preview() {
  const [modal, setModal] = useState(false);
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          Our travel
          <br />
          stories. ♡
        </div>
        <nav>
          <a className="active" href="#preview">
            Dashboard
          </a>
          <a href="#themes">Pengaturan</a>
        </nav>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span>Rheno ♡ Fadla</span>
          <span className="avatar">R</span>
        </header>
        <main>
          <div className="page-heading">
            <span className="eyebrow">OUR LITTLE WORLD</span>
            <h1>Warna untuk cerita kita.</h1>
            <p>Tempat menyimpan hal-hal kecil yang berarti.</p>
          </div>
          <a className="reminder-banner" href="#themes">
            ♡ Anniversary kita · 5 hari lagi
          </a>
          <section className="dashboard-hero" id="preview">
            <div className="hero-copy">
              <span className="eyebrow">OUR TRAVEL DIARY</span>
              <h2>
                More places.
                <br />
                More memories.
                <br />
                <em>More us.</em>
              </h2>
              <p>
                Dari rencana sederhana menjadi cerita yang ingin kita ingat
                selamanya.
              </p>
              <button className="light" onClick={() => setModal(true)}>
                Jelajahi perjalanan kita
              </button>
            </div>
            <div className="hero-art">
              <div className="polaroid big">
                <img
                  alt="Foto contoh"
                  src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='320'%3E%3Crect width='300' height='320' fill='%2393b8ac'/%3E%3Ccircle cx='200' cy='80' r='38' fill='%23ffe3b2'/%3E%3Cpath d='M0 320V210L110 110 300 320' fill='%23517463'/%3E%3Cpath d='M90 320L235 170 300 240V320' fill='%237f9b7a'/%3E%3C/svg%3E"
                />
                <span>you, me & somewhere new ♡</span>
              </div>
              <span className="hand-heart">♡</span>
            </div>
          </section>
          <div className="settings-grid">
            <section className="panel" id="themes">
              <ThemePicker />
            </section>
            <section className="panel">
              <h2>Tanggal penting</h2>
              <p>Kenangan kecil untuk kita berdua.</p>
              <label>
                Judul
                <input defaultValue="Anniversary kita" />
              </label>
              <label>
                Tanggal
                <input type="date" defaultValue="2026-10-28" />
              </label>
              <label>
                Jenis
                <select defaultValue="annual">
                  <option value="annual">Setiap tahun</option>
                </select>
              </label>
              <label>
                Cerita
                <textarea defaultValue="Sampai petualangan berikutnya ♡" />
              </label>
              <div className="actions">
                <button onClick={() => setModal(true)}>Simpan</button>
                <button className="secondary">Batal</button>
              </div>
              <p className="error">Contoh pesan kesalahan</p>
              <small>Hanya untuk kalian berdua.</small>
            </section>
          </div>
        </main>
      </div>
      {modal && (
        <Modal title="Kenangan kita" onClose={() => setModal(false)}>
          <p>Foto dan cerita tetap dengan warna aslinya.</p>
          <label>
            Caption
            <input defaultValue="Our little story" />
          </label>
          <button onClick={() => setModal(false)}>Selesai</button>
        </Modal>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<Preview />);
