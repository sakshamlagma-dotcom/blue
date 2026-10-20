import { env } from "../config/env.js";

const ENGINE_BY_CATEGORY = {
  web: "google",
  education: "google",
  images: "google_images",
  videos: "google_videos",
  news: "google_news",
};

const SEARCHABLE_CATEGORIES = new Set(Object.keys(ENGINE_BY_CATEGORY));
const MAX_RESULTS = 10;

export class SearchProviderError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "SearchProviderError";
    this.status = status;
  }
}

export function isSearchCategory(category) {
  return SEARCHABLE_CATEGORIES.has(category);
}

function validHttpUrl(value) {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
      return "";
    }
    return url.href;
  } catch {
    return "";
  }
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function sourceName(value, resultUrl) {
  if (typeof value === "string") return value.trim();
  if (value && typeof value.name === "string") return value.name.trim();
  try {
    return resultUrl ? new URL(resultUrl).hostname.replace(/^www\./, "") : "";
  } catch {
    return "";
  }
}

export function normalizeSearchResults(data, category, limit = MAX_RESULTS) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new SearchProviderError("Search provider returned an invalid response.", 502);
  }
  if (data.error) {
    throw new SearchProviderError("Search provider could not complete the request.", 502);
  }

  const rows = category === "images"
    ? data.images_results
    : category === "videos"
      ? data.video_results
      : category === "news"
        ? data.news_results
        : data.organic_results;
  if (!Array.isArray(rows)) {
    if (rows === undefined && (data.search_metadata || data.search_parameters)) return [];
    throw new SearchProviderError("Search provider returned an invalid response.", 502);
  }

  return rows.slice(0, limit).flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const url = validHttpUrl(row.link || row.original || row.url);
    const title = text(row.title);
    if (!url || !title) return [];

    const result = {
      title,
      url,
      displayUrl: new URL(url).hostname.replace(/^www\./, ""),
      snippet: text(row.snippet || row.description),
      source: sourceName(row.source, url),
      type: category,
    };
    const thumbnail = validHttpUrl(row.thumbnail || row.thumbnail_url);
    if (thumbnail && ["images", "videos", "news"].includes(category)) {
      result.thumbnail = thumbnail;
    }
    const date = text(row.date || row.published);
    if (date) result.date = date;
    const duration = text(row.length || row.duration);
    if (duration && category === "videos") result.duration = duration;
    return [result];
  });
}

export async function searchWithSerpApi({
  query,
  category,
  safeSearch = true,
  fetchImpl = fetch,
}) {
  if (!env.serpapiKey) {
    throw new SearchProviderError("Search provider is not configured.", 503);
  }
  if (!isSearchCategory(category)) {
    throw new SearchProviderError("Unsupported search category.", 400);
  }

  const params = new URLSearchParams({
    engine: ENGINE_BY_CATEGORY[category],
    q: query,
    api_key: env.serpapiKey,
  });
  if (safeSearch && ["web", "education", "images"].includes(category)) {
    params.set("safe", "active");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.searchRequestTimeoutMs);
  try {
    let response;
    try {
      response = await fetchImpl(`https://serpapi.com/search.json?${params}`, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new SearchProviderError("Search provider request timed out.", 504);
      }
      throw new SearchProviderError("Search provider could not be reached.", 502);
    }

    if (!response.ok) {
      throw new SearchProviderError(
        response.status === 429
          ? "Search provider rate limit reached."
          : "Search provider could not complete the request.",
        response.status === 429 ? 429 : 502
      );
    }

    let data;
    try {
      data = await response.json();
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new SearchProviderError("Search provider request timed out.", 504);
      }
      throw new SearchProviderError("Search provider returned invalid JSON.", 502);
    }
    return normalizeSearchResults(data, category, MAX_RESULTS);
  } finally {
    clearTimeout(timeout);
  }
}
