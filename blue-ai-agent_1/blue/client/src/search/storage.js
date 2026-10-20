const STORAGE_KEYS = {
  preferences: "blue-search-preferences",
  history: "blue-search-history",
  bookmarks: "blue-search-bookmarks",
};

export const DEFAULT_PREFERENCES = {
  theme: "system",
  historyEnabled: true,
  defaultCategory: "web",
  safeSearch: true,
};

export const SEARCH_CATEGORIES = ["web", "images", "videos", "news", "education"];

function readJson(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function readPreferences() {
  const value = readJson(STORAGE_KEYS.preferences, {});
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...DEFAULT_PREFERENCES };
  }
  return {
    theme: ["system", "light", "dark"].includes(value.theme) ? value.theme : "system",
    historyEnabled: value.historyEnabled !== false,
    defaultCategory: SEARCH_CATEGORIES.includes(value.defaultCategory)
      ? value.defaultCategory
      : "web",
    safeSearch: value.safeSearch !== false,
  };
}

export function writePreferences(value) {
  return writeJson(STORAGE_KEYS.preferences, value);
}

export function readHistory() {
  const value = readJson(STORAGE_KEYS.history, []);
  if (!Array.isArray(value)) return [];
  return value.filter((item) =>
    item &&
    typeof item.query === "string" &&
    item.query.trim() &&
    typeof item.id === "string"
  );
}

export function writeHistory(value) {
  return writeJson(STORAGE_KEYS.history, value);
}

export function readBookmarks() {
  const value = readJson(STORAGE_KEYS.bookmarks, []);
  if (!Array.isArray(value)) return [];
  return value.filter((item) =>
    item &&
    typeof item.title === "string" &&
    typeof item.url === "string" &&
    isSafeHttpUrl(item.url)
  );
}

export function writeBookmarks(value) {
  return writeJson(STORAGE_KEYS.bookmarks, value);
}

export function isSafeHttpUrl(value) {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function resolveTheme(theme) {
  if (theme !== "system") return theme;
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}
