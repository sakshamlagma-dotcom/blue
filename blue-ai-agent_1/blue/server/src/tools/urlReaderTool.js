import * as cheerio from "cheerio";
import { fetchPublicUrl } from "./safeUrlFetch.js";

export const urlReaderTool = {
  name: "url_reader",
  description:
    "Fetch a specific web page URL (e.g. a result found via web_search) and extract its main readable text content. Use this to read a source in depth before summarizing or citing it.",
  inputSchema: {
    type: "object",
    properties: {
      url: { type: "string", description: "Full URL, including https://" },
    },
    required: ["url"],
  },
  async execute({ url }) {
    const response = await fetchPublicUrl(url);
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Could not fetch URL (status ${response.status}).`);
    }
    const contentType = response.contentType;
    if (!contentType.toLowerCase().includes("text/html")) {
      return { url: response.url, note: `Non-HTML content-type (${contentType}); cannot extract text.` };
    }
    const $ = cheerio.load(response.body);
    $("script, style, nav, footer, header, noscript").remove();
    const title = $("title").text().trim();
    let text = $("body").text().replace(/\s+/g, " ").trim();
    const MAX_CHARS = 12000;
    const truncated = text.length > MAX_CHARS;
    if (truncated) text = text.slice(0, MAX_CHARS);
    return { url: response.url, title, truncated, content: text };
  },
};
