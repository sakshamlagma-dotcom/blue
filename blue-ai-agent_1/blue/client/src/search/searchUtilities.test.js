import test from "node:test";
import assert from "node:assert/strict";
import { fetchInstantAnswer } from "./instantAnswer.js";
import {
  isSafeHttpUrl,
  readHistory,
  readPreferences,
  resolveTheme,
  writeHistory,
} from "./storage.js";

test("only credential-free HTTP and HTTPS links are considered safe", () => {
  assert.equal(isSafeHttpUrl("https://example.com/path"), true);
  assert.equal(isSafeHttpUrl("http://example.com"), true);
  assert.equal(isSafeHttpUrl("javascript:alert(1)"), false);
  assert.equal(isSafeHttpUrl("https://user:pass@example.com"), false);
  assert.equal(isSafeHttpUrl("not a url"), false);
});

test("local data falls back safely when browser storage is unavailable or corrupt", () => {
  const originalWindow = globalThis.window;
  try {
    delete globalThis.window;
    assert.deepEqual(readHistory(), []);
    assert.equal(writeHistory([]), false);

    globalThis.window = {
      localStorage: {
        getItem: () => "{invalid json",
        setItem: () => { throw new Error("storage blocked"); },
      },
    };
    assert.equal(readPreferences().historyEnabled, true);
    assert.equal(writeHistory([]), false);
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
});

test("system theme resolves to the browser preference", () => {
  const originalWindow = globalThis.window;
  try {
    globalThis.window = { matchMedia: () => ({ matches: true }) };
    assert.equal(resolveTheme("system"), "dark");
    assert.equal(resolveTheme("light"), "light");
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
});

test("DuckDuckGo Instant Answer responses are parsed and unsafe links are omitted", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({
        Heading: "Example",
        AbstractText: "A real summary.",
        AbstractSource: "Example source",
        AbstractURL: "https://example.com/",
        RelatedTopics: [
          { Text: "Related page", FirstURL: "https://example.com/related" },
          { Text: "Unsafe", FirstURL: "javascript:alert(1)" },
        ],
      }),
    });
    const answer = await fetchInstantAnswer("example");
    assert.equal(answer.heading, "Example");
    assert.equal(answer.text, "A real summary.");
    assert.equal(answer.related.length, 1);
    assert.equal(answer.related[0].url, "https://example.com/related");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("empty DuckDuckGo responses do not create invented answers", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({ Heading: "", AbstractText: "", RelatedTopics: [] }),
    });
    assert.deepEqual(await fetchInstantAnswer("not found"), {
      heading: "",
      text: "",
      source: "",
      url: "",
      image: "",
      related: [],
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
