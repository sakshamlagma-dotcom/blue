import test from "node:test";
import assert from "node:assert/strict";

const testKey = "local-test-key-not-a-credential";
process.env.GEMINI_API_KEY = testKey;
const { geminiProvider } = await import("../src/providers/geminiProvider.js");

test("Gemini API key is sent in a header, not the request URL or body", async () => {
  const originalFetch = globalThis.fetch;
  let capturedRequest;
  globalThis.fetch = async (url, options) => {
    capturedRequest = { url: String(url), options };
    return {
      ok: true,
      async json() {
        return { candidates: [{ content: { parts: [{ text: "Test response" }] } }] };
      },
    };
  };

  try {
    const result = await geminiProvider.generate({
      messages: [{ role: "user", content: "Hello" }],
    });

    assert.equal(result.text, "Test response");
    assert.equal(new URL(capturedRequest.url).searchParams.has("key"), false);
    assert.equal(capturedRequest.options.headers["x-goog-api-key"], testKey);
    assert.equal(capturedRequest.options.body.includes(testKey), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
