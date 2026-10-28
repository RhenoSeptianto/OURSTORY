import { useState } from "react";
import { Check, Heart, Moon } from "lucide-react";
import {
  applyTheme,
  readTheme,
  themes,
  applyBannerStyle,
  readBannerStyle,
} from "./themes";
import type { BannerStyle } from "./themes";
export function ThemePicker() {
  const [selected, setSelected] = useState(readTheme);
  const [banner, setBanner] = useState(readBannerStyle);
  return (
    <section className="theme-picker" aria-label="Tema aplikasi">
      <h3>Warna untuk cerita kita ♡</h3>
      <p>
        Pilih suasana yang kamu suka. Tersimpan di perangkat ini; kamu dan
        pasangan bisa memakai tema berbeda.
      </p>
      <div className="theme-options" role="group" aria-label="Pilih tema">
        {themes.map((theme) => (
          <button
            key={theme.id}
            type="button"
            className="theme-choice"
            aria-pressed={selected === theme.id}
            onClick={() => {
              applyTheme(theme.id);
              setSelected(theme.id);
            }}
          >
            <span
              className="theme-swatch"
              aria-hidden="true"
              style={{ background: theme.colors[0], color: theme.colors[2] }}
            >
              <span style={{ background: theme.colors[1] }}>
                {theme.dark ? <Moon size={18} /> : <Heart size={18} />}
              </span>
              <span className="theme-swatch-heart">♡</span>
              {selected === theme.id && <Check size={16} />}
            </span>
            <strong>{theme.name}</strong>
            <small>{theme.description}</small>
          </button>
        ))}
      </div>
      <p className="theme-selection" role="status">
        Tema aktif: {themes.find((t) => t.id === selected)!.name}
      </p>
      <div className="banner-preference">
        <label>
          Background banner
          <select
            value={banner}
            onChange={(e) => {
              const next = e.target.value as BannerStyle;
              applyBannerStyle(next);
              setBanner(next);
            }}
          >
            <option value="theme">Ikuti tema · ilustrasi manis</option>
            <option value="plain">Polos · warna tema saja</option>
          </select>
        </label>
        <p>
          Ganti tema, ganti suasana: dari bunga kecil sampai rasi bintang hati.
          Pilihan tersimpan di perangkat ini.
        </p>
      </div>
    </section>
  );
}
