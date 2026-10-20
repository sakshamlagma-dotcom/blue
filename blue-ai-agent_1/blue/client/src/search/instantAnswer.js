import { isSafeHttpUrl } from "./storage.js";

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function parseRelatedTopics(topics) {
  if (!Array.isArray(topics)) return [];
  return topics.flatMap((topic) => {
    if (Array.isArray(topic?.Topics)) return parseRelatedTopics(topic.Topics);
    const title = text(topic?.Text);
    const url = text(topic?.FirstURL);
    if (!title || !isSafeHttpUrl(url)) return [];
    return [{ title, url }];
  });
}

export async function fetchInstantAnswer(query, signal) {
  const params = new URLSearchParams({
    q: query,
    format: "json",
    no_html: "1",
    no_redirect: "1",
  });
  const response = await fetch(`https://api.duckduckgo.com/?${params}`, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error("DuckDuckGo Instant Answer API request failed.");
  }
  const data = await response.json();
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("DuckDuckGo returned an invalid response.");
  }

  const abstractUrl = text(data.AbstractURL);
  const abstractText = text(data.AbstractText);
  const answer = text(data.Answer);
  const answerUrl = text(data.DefinitionURL || abstractUrl);
  return {
    heading: text(data.Heading) || (answer ? "Instant answer" : ""),
    text: answer || abstractText,
    source: text(data.AbstractSource || data.DefinitionSource),
    url: isSafeHttpUrl(answerUrl) ? answerUrl : "",
    image: isSafeHttpUrl(text(data.Image)) ? text(data.Image) : "",
    related: parseRelatedTopics(data.RelatedTopics).slice(0, 6),
  };
}
