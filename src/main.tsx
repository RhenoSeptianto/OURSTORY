import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import "./style.css";
import "./themes.css";
import {
  applyTheme,
  readTheme,
  applyBannerStyle,
  readBannerStyle,
} from "./themes";
applyTheme(readTheme());
applyBannerStyle(readBannerStyle());
const update = registerSW({
  onNeedRefresh() {
    if (confirm("Versi baru tersedia. Muat ulang aplikasi?")) void update(true);
  },
});
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
);
