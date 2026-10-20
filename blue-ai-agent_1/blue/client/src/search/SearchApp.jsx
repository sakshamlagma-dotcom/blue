import { useEffect, useMemo, useRef, useState } from "react";
import { fetchInstantAnswer } from "./instantAnswer.js";
import {
  isSafeHttpUrl,
  readBookmarks,
  readHistory,
  readPreferences,
  resolveTheme,
  writeBookmarks,
  writeHistory,
  writePreferences,
} from "./storage.js";
import "./search.css";

const CATEGORIES = [
  { id: "web", label: "All" },
  { id: "images", label: "Images" },
  { id: "videos", label: "Videos" },
  { id: "news", label: "News" },
  { id: "education", label: "Education" },
];
const API_BASE = (import.meta.env.VITE_SEARCH_API_BASE || "/api").replace(/\/$/, "");

function Icon({ name, size = 20 }) {
  const paths = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    mic: <><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10v2a7 7 0 0 0 14 0v-2m-7 9v3m-4 0h8" /></>,
    bookmark: <><path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4-6 4z" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1a1.7 1.7 0 0 1-2.4 2.4l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a1.7 1.7 0 0 1-3.4 0v-.2a1.7 1.7 0 0 0-2.9-1.2l-.1.1a1.7 1.7 0 0 1-2.4-2.4l.1-.1a1.7 1.7 0 0 0-1.2-2.9H4a1.7 1.7 0 0 1 0-3.4h.2a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a1.7 1.7 0 0 1 2.4-2.4l.1.1a1.7 1.7 0 0 0 2.9-1.2V2a1.7 1.7 0 0 1 3.4 0v.2a1.7 1.7 0 0 0 2.9 1.2l.1-.1a1.7 1.7 0 0 1 2.4 2.4l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a1.7 1.7 0 0 1 0 3.4h-.2a1.7 1.7 0 0 0-1.2 2.9Z" /></>,
    arrow: <><path d="M7 17 17 7M7 7h10v10" /></>,
    back: <><path d="m15 18-6-6 6-6" /><path d="M9 12h12" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></>,
    moon: <path d="M20.5 14.4A8.5 8.5 0 0 1 9.6 3.5 8.5 8.5 0 1 0 20.5 14.4Z" />,
  };
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

function externalSearchUrl(category, query) {
  const params = new URLSearchParams({ q: query });
  if (category === "images") {
    params.set("iax", "images");
    params.set("ia", "images");
  } else if (category === "videos") {
    params.set("iax", "videos");
    params.set("ia", "videos");
  } else if (category === "news") {
    params.set("iar", "news");
    params.set("ia", "news");
  }
  return `https://duckduckgo.com/?${params}`;
}

function displayDate(value) {
  if (!value) return "";
  return value;
}

function SearchResult({ result, saved, onBookmark }) {
  if (!isSafeHttpUrl(result.url)) return null;
  return (
    <article className="search-result">
      {result.thumbnail && isSafeHttpUrl(result.thumbnail) && (
        <a className="result-image-link" href={result.url} target="_blank" rel="noopener noreferrer"
          aria-label={`Open ${result.title}`}>
          <img src={result.thumbnail} alt={`Thumbnail for ${result.title}`} loading="lazy" referrerPolicy="no-referrer"
            onError={(event) => { event.currentTarget.hidden = true; }} />
        </a>
      )}
      <div className="result-copy">
        <div className="result-source">
          <span className="source-mark" aria-hidden="true">{(result.source || result.displayUrl || "↗").slice(0, 1).toUpperCase()}</span>
          <span>{result.source || result.displayUrl}</span>
          {result.date && <span className="result-date">{displayDate(result.date)}</span>}
        </div>
        <a className="result-title" href={result.url} target="_blank" rel="noopener noreferrer">{result.title}</a>
        {result.snippet && <p className="result-snippet">{result.snippet}</p>}
        {result.duration && <span className="result-duration">{result.duration}</span>}
      </div>
      <button className={`bookmark-result ${saved ? "is-saved" : ""}`} type="button"
        onClick={() => onBookmark(result)} aria-label={saved ? "Remove bookmark" : "Save bookmark"}
        title={saved ? "Remove bookmark" : "Save result"}>
        <Icon name="bookmark" size={18} />
      </button>
    </article>
  );
}

function SearchModal({ title, onClose, children }) {
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const panel = panelRef.current;
    const focusableSelector = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href], textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusables = () => [...(panel?.querySelectorAll(focusableSelector) || [])];
    focusables()[0]?.focus();
    const handleKeys = (event) => {
      if (event.key === "Escape") {
        closeRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      if (!items.length) {
        event.preventDefault();
      } else if (event.shiftKey && document.activeElement === items[0]) {
        event.preventDefault();
        items[items.length - 1].focus();
      } else if (!event.shiftKey && document.activeElement === items[items.length - 1]) {
        event.preventDefault();
        items[0].focus();
      }
    };
    window.addEventListener("keydown", handleKeys);
    return () => {
      window.removeEventListener("keydown", handleKeys);
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, []);

  return (
    <div className="search-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section ref={panelRef} className="search-modal" role="dialog" aria-modal="true" aria-labelledby="search-modal-title">
        <div className="search-modal-heading">
          <h2 id="search-modal-title">{title}</h2>
          <button className="icon-action" type="button" onClick={onClose} aria-label="Close dialog">
            <Icon name="close" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

export default function SearchApp() {
  const initialPreferences = useMemo(readPreferences, []);
  const initialParams = new URLSearchParams(window.location.search);
  const [preferences, setPreferences] = useState(initialPreferences);
  const [category, setCategory] = useState(
    CATEGORIES.some((item) => item.id === initialParams.get("type"))
      ? initialParams.get("type")
      : initialPreferences.defaultCategory
  );
  const [query, setQuery] = useState(initialParams.get("q") || "");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [results, setResults] = useState([]);
  const [instantAnswer, setInstantAnswer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [providerStatus, setProviderStatus] = useState(null);
  const [error, setError] = useState("");
  const [instantError, setInstantError] = useState("");
  const [notice, setNotice] = useState("");
  const [history, setHistory] = useState(() => readHistory());
  const [bookmarks, setBookmarks] = useState(() => readBookmarks());
  const [focused, setFocused] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1);
  const [modal, setModal] = useState("");
  const [voiceMessage, setVoiceMessage] = useState("");
  const [listening, setListening] = useState(false);
  const inputRef = useRef(null);
  const requestRef = useRef(0);
  const abortRef = useRef(null);
  const statusPromiseRef = useRef(null);
  const initialSearchRef = useRef(false);
  const recognitionRef = useRef(null);

  const theme = resolveTheme(preferences.theme);
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const suggestions = useMemo(() => {
    if (!preferences.historyEnabled || !focused) return [];
    const term = query.trim().toLocaleLowerCase();
    return history
      .filter((item) => !term || item.query.toLocaleLowerCase().includes(term))
      .slice(0, 5);
  }, [focused, history, preferences.historyEnabled, query]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    void loadProviderStatus();
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      const nextQuery = (params.get("q") || "").trim();
      const nextCategory = CATEGORIES.some((item) => item.id === params.get("type"))
        ? params.get("type")
        : preferences.defaultCategory;
      if (nextQuery) {
        void runSearch(nextQuery, nextCategory, { navigation: "none", remember: false });
      } else {
        abortRef.current?.abort();
        setQuery("");
        setSubmittedQuery("");
        setCategory(nextCategory);
        setResults([]);
        setInstantAnswer(null);
        setError("");
        setInstantError("");
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      abortRef.current?.abort();
      recognitionRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (initialSearchRef.current) return;
    initialSearchRef.current = true;
    const params = new URLSearchParams(window.location.search);
    const initialQuery = (params.get("q") || "").trim();
    const initialCategory = CATEGORIES.some((item) => item.id === params.get("type"))
      ? params.get("type")
      : initialPreferences.defaultCategory;
    if (initialQuery) {
      void runSearch(initialQuery, initialCategory, { navigation: "none", remember: false });
    }
  }, []);

  async function loadProviderStatus() {
    if (!statusPromiseRef.current) {
      statusPromiseRef.current = fetch(`${API_BASE}/search/status`, {
        headers: { Accept: "application/json" },
      }).then(async (response) => {
        if (!response.ok) throw new Error("Search backend is not available.");
        const data = await response.json();
        if (!data || typeof data.configured !== "boolean") {
          throw new Error("Search backend returned an invalid status.");
        }
        return data;
      }).catch(() => ({
        provider: "SerpAPI",
        configured: false,
        unavailable: true,
        supportedCategories: [],
        safeSearchCategories: [],
      }));
    }
    const status = await statusPromiseRef.current;
    setProviderStatus(status);
    return status;
  }

  function persistPreferences(next) {
    setPreferences(next);
    setNotice(writePreferences(next) ? "" : "This browser could not save your preferences locally.");
  }

  function rememberQuery(value) {
    if (!preferences.historyEnabled) return;
    const next = [
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, query: value, searchedAt: Date.now() },
      ...history.filter((item) => item.query.toLocaleLowerCase() !== value.toLocaleLowerCase()),
    ].slice(0, 12);
    setHistory(next);
    if (!writeHistory(next)) setNotice("Search history could not be saved in this browser.");
  }

  function navigate(queryValue, categoryValue, navigation) {
    if (navigation === "none") return;
    const params = new URLSearchParams();
    params.set("q", queryValue);
    params.set("type", categoryValue);
    const url = `${window.location.pathname}?${params.toString()}`;
    window.history[navigation === "replace" ? "replaceState" : "pushState"](
      { search: true },
      "",
      url
    );
  }

  async function runSearch(rawQuery, nextCategory = category, options = {}) {
    const cleanQuery = rawQuery.trim().replace(/\s+/g, " ");
    if (!cleanQuery) {
      setError("Enter a search term to get started.");
      setSubmittedQuery("");
      setResults([]);
      setInstantAnswer(null);
      setInstantError("");
      setLoading(false);
      abortRef.current?.abort();
      requestRef.current += 1;
      window.history.replaceState({}, "", window.location.pathname);
      setQuery("");
      inputRef.current?.focus();
      return;
    }
    if (cleanQuery.length > 300) {
      setError("Search queries must be 300 characters or fewer.");
      return;
    }
    if (!CATEGORIES.some((item) => item.id === nextCategory)) {
      setError("Choose a supported search category.");
      return;
    }
    if (loading && cleanQuery === submittedQuery && nextCategory === category) return;

    const requestId = ++requestRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setQuery(cleanQuery);
    setSubmittedQuery(cleanQuery);
    setCategory(nextCategory);
    setFocused(false);
    setSelectedSuggestion(-1);
    setError("");
    setInstantError("");
    setNotice("");
    setResults([]);
    setInstantAnswer(null);
    setLoading(true);
    navigate(cleanQuery, nextCategory, options.navigation || "push");
    if (options.remember !== false) rememberQuery(cleanQuery);

    const wantsInstant = ["web", "education"].includes(nextCategory);
    const instantPromise = wantsInstant
      ? fetchInstantAnswer(cleanQuery, controller.signal)
          .then((value) => ({ value }))
          .catch((reason) => ({ error: reason }))
      : Promise.resolve({ value: null });

    try {
      const status = providerStatus || await loadProviderStatus();
      const providerPromise = status.configured
        ? fetch(`${API_BASE}/search?${new URLSearchParams({
            q: cleanQuery,
            category: nextCategory,
            safeSearch: preferences.safeSearch ? "true" : "false",
          })}`, {
            signal: controller.signal,
            headers: { Accept: "application/json" },
          }).then(async (response) => {
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Search provider could not complete the request.");
            if (!Array.isArray(data.results)) throw new Error("Search provider returned an invalid response.");
            return data.results;
          })
        : Promise.resolve([]);

      const [instantOutcome, providerOutcome] = await Promise.allSettled([
        instantPromise,
        providerPromise,
      ]);
      if (requestId !== requestRef.current) return;

      if (instantOutcome.status === "fulfilled") {
        const outcome = instantOutcome.value;
        if (outcome.error && outcome.error.name !== "AbortError") {
          setInstantError("Instant answers are temporarily unavailable.");
        } else if (outcome.value) {
          setInstantAnswer(outcome.value);
        }
      }
      if (providerOutcome.status === "fulfilled") {
        setResults(providerOutcome.value);
      } else if (providerOutcome.reason?.name !== "AbortError") {
        setError(providerOutcome.reason?.message || "Search could not be completed. Please try again.");
      }
      if (!status.configured && status.unavailable) {
        setNotice("The search API is not connected. Instant answers may still appear; use external search or configure a provider to see full results.");
      } else if (!status.configured) {
        setNotice("Full results need a server-side SerpAPI key. You can still use Instant Answers and external search.");
      }
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    void runSearch(query, category);
  }

  function selectCategory(nextCategory) {
    setCategory(nextCategory);
    if (query.trim()) void runSearch(query, nextCategory);
  }

  function toggleBookmark(result) {
    const exists = bookmarks.some((item) => item.url === result.url);
    const next = exists
      ? bookmarks.filter((item) => item.url !== result.url)
      : [{
          title: result.title,
          url: result.url,
          snippet: result.snippet || "",
          source: result.source || result.displayUrl || "",
          category,
          savedAt: Date.now(),
        }, ...bookmarks];
    setBookmarks(next);
    setNotice(writeBookmarks(next) ? "" : "Bookmarks could not be saved in this browser.");
  }

  function removeHistory(id) {
    const next = history.filter((item) => item.id !== id);
    setHistory(next);
    if (!writeHistory(next)) setNotice("Search history could not be updated in this browser.");
  }

  function clearHistory() {
    setHistory([]);
    setNotice(writeHistory([]) ? "Search history cleared." : "Search history could not be cleared in this browser.");
  }

  function clearBookmarks() {
    setBookmarks([]);
    setNotice(writeBookmarks([]) ? "Bookmarks cleared." : "Bookmarks could not be cleared in this browser.");
  }

  function resetPreferences() {
    const next = {
      theme: "system",
      historyEnabled: true,
      defaultCategory: "web",
      safeSearch: true,
    };
    setPreferences(next);
    setHistory([]);
    setBookmarks([]);
    const saved = writePreferences(next) && writeHistory([]) && writeBookmarks([]);
    setNotice(saved ? "Local search preferences, history, and bookmarks were reset." : "Some local data could not be reset.");
  }

  function handleSuggestionKeyDown(event) {
    if (event.key === "ArrowDown" && suggestions.length) {
      event.preventDefault();
      setSelectedSuggestion((index) => (index + 1) % suggestions.length);
    } else if (event.key === "ArrowUp" && suggestions.length) {
      event.preventDefault();
      setSelectedSuggestion((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
    } else if (event.key === "Escape") {
      setFocused(false);
      setSelectedSuggestion(-1);
    } else if (event.key === "Enter" && selectedSuggestion >= 0) {
      event.preventDefault();
      void runSearch(suggestions[selectedSuggestion].query, category);
    }
  }

  function startVoiceSearch() {
    if (!SpeechRecognition) return;
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      setVoiceMessage("Voice search canceled.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = navigator.language || "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => {
      setListening(true);
      setVoiceMessage("Listening. Speak your search, or cancel.");
    };
    recognition.onresult = (event) => {
      const spoken = event.results?.[0]?.[0]?.transcript?.trim();
      if (spoken) void runSearch(spoken, category);
    };
    recognition.onerror = (event) => {
      setListening(false);
      setVoiceMessage(event.error === "not-allowed"
        ? "Microphone access was denied. You can still type your search."
        : "Voice search is unavailable right now.");
    };
    recognition.onend = () => setListening(false);
    try {
      recognition.start();
    } catch {
      setListening(false);
      setVoiceMessage("Voice search could not start in this browser.");
    }
  }

  function openAssistant() {
    window.location.hash = "assistant";
  }

  const externalUrl = submittedQuery ? externalSearchUrl(category, submittedQuery) : "";
  const emptyLabel = category === "images" ? "No image results found." :
    category === "videos" ? "No video results found." :
      category === "news" ? "No news results found." : "No web results found.";

  return (
    <main className="search-page">
      <header className="search-header">
        <a className="search-brand" href="./" onClick={(event) => {
          event.preventDefault();
          window.history.pushState({}, "", window.location.pathname);
          setQuery("");
          setSubmittedQuery("");
          setResults([]);
          setInstantAnswer(null);
          setError("");
          setNotice("");
        }} aria-label="BLUE Search home">
          <span className="brand-symbol" aria-hidden="true">
            <svg viewBox="0 0 36 36" fill="none"><path d="M18 2.8 31.2 10.4v15.2L18 33.2 4.8 25.6V10.4L18 2.8Z" fill="currentColor" opacity=".14" />
              <path d="M10 20.8c2.4-5.3 4.8-8 7.3-8 2.4 0 4.7 2.7 8.7 8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
              <circle cx="10" cy="20.8" r="1.7" fill="currentColor" /><circle cx="18" cy="12.8" r="1.7" fill="currentColor" /><circle cx="26" cy="20.8" r="1.7" fill="currentColor" /></svg>
          </span>
          <span className="brand-name">BLUE <span>Search</span></span>
        </a>
        <div className="header-actions">
          <button className="header-link saved-link" type="button" onClick={() => setModal("bookmarks")}>
            <Icon name="bookmark" size={17} /><span>Saved</span>{bookmarks.length > 0 && <b>{bookmarks.length}</b>}
          </button>
          <button className="header-link" type="button" onClick={() => setModal("settings")} aria-label="Open search settings">
            <Icon name="settings" size={17} /><span>Settings</span>
          </button>
          <button className="theme-button" type="button" onClick={() => persistPreferences({
            ...preferences,
            theme: theme === "dark" ? "light" : "dark",
          })} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>
            <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
          </button>
          <button className="assistant-link" type="button" onClick={openAssistant}>Blue Assistant <Icon name="arrow" size={15} /></button>
        </div>
      </header>

      <div className={`search-main ${submittedQuery ? "has-query" : ""}`}>
        {!submittedQuery && (
          <section className="hero" aria-labelledby="hero-title">
            <div className="hero-eyebrow"><span /> A clearer way to explore</div>
            <h1 id="hero-title">Search smarter.<br /><span>Discover more.</span></h1>
            <p className="hero-description">A thoughtful search experience that brings useful answers and the wider web closer together.</p>
          </section>
        )}

        <section className="search-workspace" aria-label="Search">
          <form className="search-form" role="search" onSubmit={handleSubmit}>
            <label htmlFor="blue-search-query" className="visually-hidden">Search the web</label>
            <Icon name="search" size={21} />
            <input
              ref={inputRef}
              id="blue-search-query"
              type="search"
              maxLength={300}
              value={query}
              placeholder="Ask a question or enter a topic"
              autoComplete="off"
              aria-autocomplete="list"
              aria-expanded={suggestions.length > 0}
              aria-controls={suggestions.length > 0 ? "search-suggestions" : undefined}
              aria-activedescendant={selectedSuggestion >= 0 ? `search-suggestion-${selectedSuggestion}` : undefined}
              onChange={(event) => {
                setQuery(event.target.value);
                setSelectedSuggestion(-1);
              }}
              onFocus={() => setFocused(true)}
              onBlur={() => window.setTimeout(() => setFocused(false), 120)}
              onKeyDown={handleSuggestionKeyDown}
            />
            {query && <button className="clear-query" type="button" onClick={() => {
              abortRef.current?.abort();
              requestRef.current += 1;
              setQuery("");
              setSubmittedQuery("");
              setResults([]);
              setInstantAnswer(null);
              setInstantError("");
              setError("");
              setLoading(false);
              window.history.replaceState({}, "", window.location.pathname);
              inputRef.current?.focus();
            }} aria-label="Clear search"><Icon name="close" size={18} /></button>}
            {SpeechRecognition && (
              <button className={`voice-button ${listening ? "listening" : ""}`} type="button" onClick={startVoiceSearch}
                aria-label={listening ? "Cancel voice search" : "Start voice search"}>
                <Icon name="mic" size={19} />
              </button>
            )}
            <button className="submit-search" type="submit" disabled={loading}>
              {loading ? <span className="button-spinner" aria-hidden="true" /> : <Icon name="search" size={17} />}
              <span>{loading ? "Searching" : "Search"}</span>
            </button>
            {suggestions.length > 0 && (
              <ul className="search-suggestions" id="search-suggestions" role="listbox" aria-label="Recent searches">
                {suggestions.map((item, index) => (
                  <li key={item.id} id={`search-suggestion-${index}`} role="option" aria-selected={selectedSuggestion === index}>
                    <button type="button" onMouseDown={(event) => event.preventDefault()}
                      onClick={() => void runSearch(item.query, category)}>
                      <Icon name="search" size={16} /><span>{item.query}</span>
                    </button>
                    <button className="remove-suggestion" type="button" onMouseDown={(event) => event.preventDefault()}
                      onClick={() => removeHistory(item.id)} aria-label={`Remove recent search ${item.query}`}>
                      <Icon name="close" size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </form>
          {voiceMessage && <p className="voice-status" role="status">{voiceMessage}</p>}
          <nav className="category-tabs" role="tablist" aria-label="Search category">
            {CATEGORIES.map((item) => (
              <button key={item.id} role="tab" aria-selected={category === item.id}
                className={category === item.id ? "active" : ""} type="button"
                onClick={() => selectCategory(item.id)}>{item.label}</button>
            ))}
          </nav>
        </section>

        {!submittedQuery && (
          <section className="home-extras">
            <div className="trust-note"><span className="trust-icon">✦</span>
              <span>Answers where available. Real results when configured. No invented links.</span></div>
            {preferences.historyEnabled && history.length > 0 && (
              <div className="recent-searches">
                <div className="section-eyebrow">PICK UP WHERE YOU LEFT OFF</div>
                <div className="recent-list">
                  {history.slice(0, 4).map((item) => (
                    <button key={item.id} type="button" onClick={() => void runSearch(item.query, category)}>
                      <Icon name="search" size={15} /><span>{item.query}</span><Icon name="arrow" size={14} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {submittedQuery && (
          <section className="results-region" aria-live="polite" aria-busy={loading}>
            <h1 className="visually-hidden">Search results for {submittedQuery}</h1>
            <div className="results-toolbar">
              <p>{loading ? "Searching..." : results.length ? `${results.length} results` : "Search results"}</p>
              {externalUrl && <a className="external-search" href={externalUrl} target="_blank" rel="noopener noreferrer">
                Search DuckDuckGo <Icon name="arrow" size={14} />
              </a>}
            </div>
            {error && <div className="search-alert" role="alert"><span>{error}</span>
              <button type="button" onClick={() => void runSearch(query, category)}>Try again</button>
            </div>}
            {notice && <div className="provider-notice" role="status">{notice}</div>}
            {instantError && <p className="subtle-notice" role="status">{instantError}</p>}

            {instantAnswer && (instantAnswer.text || instantAnswer.related.length > 0) && (
              <article className="instant-card">
                <div className="instant-kicker"><span className="instant-spark">✦</span> Instant answer
                  <span className="instant-provider">DuckDuckGo</span></div>
                {instantAnswer.heading && <h2>{instantAnswer.heading}</h2>}
                {instantAnswer.text && <p>{instantAnswer.text}</p>}
                {instantAnswer.image && <img className="instant-image" src={instantAnswer.image}
                  alt={instantAnswer.heading ? `${instantAnswer.heading} image` : "Instant answer image"}
                  loading="lazy" referrerPolicy="no-referrer" />}
                {instantAnswer.url && <a href={instantAnswer.url} target="_blank" rel="noopener noreferrer">
                  {instantAnswer.source || new URL(instantAnswer.url).hostname}<Icon name="arrow" size={14} />
                </a>}
                {instantAnswer.related.length > 0 && <div className="related-links">
                  {instantAnswer.related.map((topic) => <a key={topic.url} href={topic.url} target="_blank"
                    rel="noopener noreferrer">{topic.title}<Icon name="arrow" size={13} /></a>)}
                </div>}
              </article>
            )}

            {loading && <div className="loading-state"><span className="loading-orbit" />
              <span>Finding useful information</span></div>}

            {!loading && results.length > 0 && (
              <div className={`result-list ${category === "images" ? "image-results" : ""}`}>
                {results.map((result) => <SearchResult key={result.url} result={result}
                  saved={bookmarks.some((item) => item.url === result.url)} onBookmark={toggleBookmark} />)}
              </div>
            )}

            {!loading && !error && results.length === 0 && !notice && !instantAnswer?.text && (
              <div className="no-results"><div className="no-results-icon"><Icon name="search" size={23} /></div>
                <h2>{emptyLabel}</h2>
                <p>{providerStatus?.configured
                  ? "Try a different search phrase or check your spelling."
                  : "BLUE Search does not have a full web index. Configure a search provider for live results, or continue with DuckDuckGo."}</p>
                {externalUrl && <a className="external-search-button" href={externalUrl} target="_blank"
                  rel="noopener noreferrer">Continue on DuckDuckGo <Icon name="arrow" size={15} /></a>}
              </div>
            )}

            <p className="results-disclaimer">
              {category === "education"
                ? "Education results use the configured web provider; resources are not independently verified."
                : category === "images"
                  ? "Image results link to their source. Check each publisher's terms before reuse."
                  : "Instant Answers are not a comprehensive web search. Search provider and source attribution are shown when available."}
            </p>
          </section>
        )}
      </div>

      <footer className="search-footer">
        <span>BLUE Search <span className="footer-dot">·</span> Search Smarter. Discover More.</span>
        <div><button type="button" onClick={() => setModal("settings")}>Privacy & settings</button>
          <button type="button" onClick={openAssistant}>Blue Assistant</button></div>
      </footer>

      {modal === "settings" && (
        <SearchModal title="Search settings" onClose={() => setModal("")}>
          <div className="settings-group">
            <label className="setting-row"><span><strong>Appearance</strong><small>Choose a theme or follow your device.</small></span>
              <select value={preferences.theme} onChange={(event) => persistPreferences({ ...preferences, theme: event.target.value })}>
                <option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option>
              </select></label>
            <label className="setting-row"><span><strong>Default category</strong><small>Category selected when you open BLUE Search.</small></span>
              <select value={preferences.defaultCategory} onChange={(event) => persistPreferences({ ...preferences, defaultCategory: event.target.value })}>
                {CATEGORIES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select></label>
            <label className="setting-row"><span><strong>Save search history</strong><small>Queries are stored only in this browser.</small></span>
              <input type="checkbox" checked={preferences.historyEnabled} onChange={(event) => {
                const next = { ...preferences, historyEnabled: event.target.checked };
                persistPreferences(next);
                if (!event.target.checked) {
                  setHistory([]);
                  if (!writeHistory([])) setNotice("Search history could not be cleared in this browser.");
                }
              }} /></label>
            <label className="setting-row"><span><strong>Safe Search</strong><small>Applied to supported SerpAPI web, education, and image searches.</small></span>
              <input type="checkbox" checked={preferences.safeSearch} onChange={(event) =>
                persistPreferences({ ...preferences, safeSearch: event.target.checked })} /></label>
          </div>
          <div className="provider-status">
            <span className={`status-dot ${providerStatus?.configured ? "ready" : ""}`} />
            <div><strong>{providerStatus?.configured ? "SerpAPI connected" : "Full search provider not configured"}</strong>
              <small>{providerStatus?.unavailable
                ? "The search backend is not reachable from this deployment."
                : providerStatus?.configured
                  ? "Web, image, video, and news results are requested through the configured server."
                  : "Instant Answers and external search remain available without an API key."}</small></div>
          </div>
          <div className="privacy-copy"><strong>Privacy</strong>
            <p>Search queries are sent to DuckDuckGo for Instant Answers and to your configured search provider when enabled. BLUE does not upload local history or bookmarks. Browser storage can be cleared below; providers may process query data under their own terms.</p>
          </div>
          <div className="settings-actions">
            <button type="button" onClick={clearHistory}>Clear history</button>
            <button type="button" onClick={clearBookmarks}>Clear bookmarks</button>
            <button className="reset-action" type="button" onClick={resetPreferences}>Reset local preferences</button>
          </div>
          {notice && <p className="modal-notice" role="status">{notice}</p>}
        </SearchModal>
      )}

      {modal === "bookmarks" && (
        <SearchModal title={`Saved links${bookmarks.length ? ` (${bookmarks.length})` : ""}`} onClose={() => setModal("")}>
          {bookmarks.length === 0 ? <div className="empty-bookmarks"><Icon name="bookmark" size={28} />
            <strong>No saved links yet</strong><p>Use the bookmark icon beside a result to save it here.</p></div>
            : <div className="saved-list">{bookmarks.map((item) => (
              <article className="saved-item" key={item.url}>
                <div><span>{item.source || new URL(item.url).hostname}</span>
                  <a href={item.url} target="_blank" rel="noopener noreferrer">{item.title}<Icon name="arrow" size={14} /></a>
                  {item.snippet && <p>{item.snippet}</p>}</div>
                <button type="button" onClick={() => toggleBookmark(item)} aria-label={`Remove ${item.title} from saved links`}>
                  <Icon name="close" size={17} /></button>
              </article>
            ))}</div>}
          {bookmarks.length > 0 && <div className="settings-actions">
            <button className="reset-action" type="button" onClick={clearBookmarks}>Clear all saved links</button></div>}
          {notice && <p className="modal-notice" role="status">{notice}</p>}
        </SearchModal>
      )}
    </main>
  );
}
