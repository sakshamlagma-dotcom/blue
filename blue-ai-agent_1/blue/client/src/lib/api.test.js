import test from "node:test";
import assert from "node:assert/strict";
import { api } from "./api.js";

test("Assistant API and uploads send the tab-scoped bearer token", async () => {
  const previousFetch = globalThis.fetch;
  const previousSessionStorage = globalThis.sessionStorage;
  const values = new Map();
  const calls = [];
  globalThis.sessionStorage = {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return new Response(
      JSON.stringify(url.endsWith("/conversations") ? { conversations: [] } : { attachments: [] }),
      { headers: { "Content-Type": "application/json" } }
    );
  };

  try {
    assert.equal(api.setAccessToken("tab-token"), true);
    await api.listConversations();
    await api.uploadFiles([new Blob(["test"])]);
    assert.equal(calls[0].options.headers.get("Authorization"), "Bearer tab-token");
    assert.equal(calls[1].options.headers.get("Authorization"), "Bearer tab-token");
    assert.equal(calls[1].options.headers.has("Content-Type"), false);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousSessionStorage === undefined) delete globalThis.sessionStorage;
    else globalThis.sessionStorage = previousSessionStorage;
  }
});
