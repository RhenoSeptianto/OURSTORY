export const themes = [
  {
    id: "cream",
    name: "Warm Paper",
    description: "Krem hangat, seperti buku kenangan.",
    colors: ["#faf8f5", "#efe1da", "#8d5263"],
    dark: false,
  },
  {
    id: "sage",
    name: "Sage Romance",
    description: "Sage dan krem, lembut dan tenang.",
    colors: ["#f4f6f0", "#dfe8da", "#486151"],
    dark: false,
  },
  {
    id: "blush",
    name: "Blush Diary",
    description: "Pink pastel untuk cerita yang manis.",
    colors: ["#fcf4f5", "#f2dfe5", "#8c435e"],
    dark: false,
  },
  {
    id: "midnight",
    name: "Midnight Rose",
    description: "Cokelat malam dan dusty pink yang hangat.",
    colors: ["#21191c", "#392830", "#e8b0bf"],
    dark: true,
  },
  {
    id: "plum",
    name: "Plum Love",
    description: "Plum lembut, pink manis, dan sedikit cinta.",
    colors: ["#241c2d", "#3b2b46", "#efb4d3"],
    dark: true,
  },
  {
    id: "moonlight",
    name: "Moonlight Sage",
    description: "Hijau malam dan sage, adem untuk berdua.",
    colors: ["#182421", "#293d35", "#b4d6bd"],
    dark: true,
  },
  {
    id: "black",
    name: "Black Valentine",
    description: "Hitam lembut dan pink mawar. Romantis, tetap lucu.",
    colors: ["#101013", "#29242c", "#f0abc7"],
    dark: true,
  },
] as const;
export type ThemeId = (typeof themes)[number]["id"];
export function readTheme(): ThemeId {
  try {
    const saved = localStorage.getItem("ots-theme");
    return themes.find((t) => t.id === saved)?.id ?? "cream";
  } catch {
    return "cream";
  }
}
export function applyTheme(id: ThemeId) {
  const theme = themes.find((t) => t.id === id)!;
  document.documentElement.dataset.theme = id;
  document.documentElement.dataset.appearance = theme.dark ? "dark" : "light";
  document.documentElement.style.colorScheme = theme.dark ? "dark" : "light";
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme.colors[0]);
  try {
    localStorage.setItem("ots-theme", id);
  } catch {
    /* Theme still works when browser storage is unavailable. */
  }
}
