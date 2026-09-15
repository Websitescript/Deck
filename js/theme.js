// Lets the four accent colors (--teal, --gold, --coral, --blue) be
// customized and persisted. Loaded on both pages so a theme picked on the
// dashboard also shows up in the terminal — only the dashboard has the
// editor UI (see initThemeDialog in dashboard.js), but applying a saved
// theme is cheap enough to just do unconditionally here on every load.
const THEME_KEY = "deck.theme";
const THEME_VARS = ["--teal", "--gold", "--coral", "--blue"];
const DEFAULT_THEME = { "--teal": "#35d399", "--gold": "#e8b04b", "--coral": "#ff6b6b", "--blue": "#6ab0ff" };
const THEME_PRESETS = {
  Default: DEFAULT_THEME,
  Sunset: { "--teal": "#ff8a5b", "--gold": "#ffd23f", "--coral": "#ee4266", "--blue": "#3bceac" },
  Violet: { "--teal": "#7c5cff", "--gold": "#f2b134", "--coral": "#ff5d8f", "--blue": "#5ec8f8" },
  Ocean: { "--teal": "#2ec4b6", "--gold": "#ffbf69", "--coral": "#ff5964", "--blue": "#4d9de0" },
  Forest: { "--teal": "#52b788", "--gold": "#e9c46a", "--coral": "#e76f51", "--blue": "#4895ef" },
};

function applyTheme(theme) {
  THEME_VARS.forEach((k) => {
    if (theme[k]) document.documentElement.style.setProperty(k, theme[k]);
  });
}

function currentTheme() {
  const style = getComputedStyle(document.documentElement);
  const theme = {};
  THEME_VARS.forEach((k) => {
    theme[k] = (style.getPropertyValue(k) || "").trim() || DEFAULT_THEME[k];
  });
  return theme;
}

function loadTheme() {
  try {
    const saved = JSON.parse(localStorage.getItem(THEME_KEY));
    if (saved) applyTheme({ ...DEFAULT_THEME, ...saved });
  } catch {
    /* malformed or missing saved theme — defaults from the stylesheet stand */
  }
}

function saveTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, JSON.stringify(theme));
  } catch {
    /* storage unavailable — theme still applies for this page view */
  }
}

loadTheme();
