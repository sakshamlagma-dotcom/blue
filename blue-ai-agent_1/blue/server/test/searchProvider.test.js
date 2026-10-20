import test from "node:test";
import assert from "node:assert/strict";
import { isSearchCategory, normalizeSearchResults } from "../src/services/searchProvider.js";

test("only supported fixed search categories are accepted", () => {
  for (const category of ["web", "images", "videos", "news", "education"]) {
    assert.equal(isSearchCategory(category), true);
  }
  assert.equal(isSearchCategory("arbitrary-url"), false);
});

test("web results normalize provider fields and exclude unsafe URLs", () => {
  const results = normalizeSearchResults({
    organic_results: [
      { title: "Useful result", link: "https://example.com/path", snippet: "Description" },
      { title: "Unsafe result", link: "javascript:alert(1)" },
      { title: "No URL" },
    ],
  }, "web");

  assert.equal(results.length, 1);
  assert.deepEqual(results[0], {
    title: "Useful result",
    url: "https://example.com/path",
    displayUrl: "example.com",
    snippet: "Description",
    source: "example.com",
    type: "web",
  });
});

test("image, video, and news result fields are normalized without fabricating data", () => {
  const image = normalizeSearchResults({
    images_results: [{
      title: "Image result",
      link: "https://source.example/photo",
      thumbnail: "https://images.example/thumb.jpg",
    }],
  }, "images")[0];
  assert.equal(image.url, "https://source.example/photo");
  assert.equal(image.thumbnail, "https://images.example/thumb.jpg");
  assert.equal(image.date, undefined);

  const video = normalizeSearchResults({
    video_results: [{
      title: "Video result",
      link: "https://video.example/watch",
      length: "3:25",
      source: "Publisher",
    }],
  }, "videos")[0];
  assert.equal(video.duration, "3:25");
  assert.equal(video.source, "Publisher");

  const news = normalizeSearchResults({
    news_results: [{
      title: "News result",
      link: "https://news.example/story",
      date: "2 hours ago",
      source: { name: "Publisher" },
    }],
  }, "news")[0];
  assert.equal(news.date, "2 hours ago");
  assert.equal(news.source, "Publisher");
});

test("missing result arrays and malformed provider payloads are surfaced", () => {
  assert.throws(() => normalizeSearchResults({}, "web"), /invalid response/);
  assert.throws(() => normalizeSearchResults(null, "web"), /invalid response/);
  assert.throws(() => normalizeSearchResults({ error: "private provider detail" }, "web"),
    /could not complete/);
});

test("valid zero-result responses normalize to an empty list", () => {
  assert.deepEqual(normalizeSearchResults({
    search_metadata: { status: "Success" },
  }, "web"), []);
  assert.deepEqual(normalizeSearchResults({ organic_results: [] }, "web"), []);
});
