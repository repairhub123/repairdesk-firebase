// Theme system — stores in localStorage, applies CSS variables to :root

export const THEMES = [
  {
    id: "default",
    name: "Default Dark",
    desc: "Clean dark — original look",
    preview: ["#0a0b10", "#c6ff3d", "#111219"],
  },
  {
    id: "ios-glass",
    name: "iOS Glass",
    desc: "Frosted glass cards, Apple style",
    preview: ["#0a0b10", "#c6ff3d", "rgba(28,30,40,0.55)"],
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    desc: "Neon cyan, grid lines, dark edge",
    preview: ["#030508", "#00ffe5", "#090d14"],
  },
  {
    id: "minimal",
    name: "Minimal",
    desc: "Pure black, no gradients, razor clean",
    preview: ["#000000", "#c6ff3d", "#0a0a0a"],
  },
];

const THEME_KEY = "repair_desk_theme";

export function getStoredTheme() {
  return localStorage.getItem(THEME_KEY) || "default";
}

export function applyTheme(id) {
  localStorage.setItem(THEME_KEY, id);
  const root = document.documentElement;

  // Remove all theme classes
  root.classList.remove("theme-default", "theme-ios-glass", "theme-cyberpunk", "theme-minimal");
  root.classList.add(`theme-${id}`);
}
