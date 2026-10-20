# Search API setup

BLUE Search works without a search-provider account: it can request supported summaries from the documented [DuckDuckGo Instant Answer API](https://duckduckgo.com/api) and open a DuckDuckGo search page as an external fallback. Instant Answers are not a comprehensive organic web-search API; empty responses are normal. The endpoint used by the browser is `https://api.duckduckgo.com/` with `q`, `format=json`, `no_html=1`, and `no_redirect=1`. Its current JSON response permits cross-origin browser reads (`Access-Control-Allow-Origin: *`); if that policy changes or the request is blocked, the UI reports the answer as unavailable and keeps the external fallback.

## Optional genuine result providers

The backend uses SerpAPI's documented fixed engines:

| BLUE category | SerpAPI engine |
|---|---|
| Web | [Google Search](https://serpapi.com/search-api) |
| Education | Google Search (ordinary web results; not independently verified or curated) |
| Images | [Google Images](https://serpapi.com/google-images-api) |
| Videos | [Google Videos](https://serpapi.com/google-videos-api) |
| News | [Google News](https://serpapi.com/google-news-api) |

The [SerpAPI pricing page](https://serpapi.com/pricing) currently advertises a free plan with 250 searches per month and a paid Starter plan at USD $25/month for 1,000 searches per month. Pricing, quotas, terms, and availability can change; verify them with SerpAPI before deployment. Each category request consumes provider usage. Results and thumbnails remain subject to provider terms and source-site rights. Image results link to their original source; verify licensing before reuse.

1. Create a SerpAPI account and obtain an API key from its dashboard.
2. On the **backend host**, set `SERPAPI_KEY` as a secret environment variable. Do not put it in Vite variables, HTML, JavaScript, or a public `.env` file.
3. Deploy `server/` with Node.js 18 or newer, set `SEARCH_ONLY=true` so the public process mounts only health and search routes (not the existing Assistant, conversation, or upload endpoints), and set `CLIENT_ORIGIN` to the exact origin serving the frontend (for example `https://sakshamlagma-dotcom.github.io`). Set `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW_MS` to suitable limits for that host and plan.
4. In the frontend build environment, optionally set `VITE_SEARCH_API_BASE` to the backend API base, such as `https://search-api.example.com/api`. It is a public URL, not a secret. Rebuild and redeploy the static site after changing it.
5. Verify `GET <backend-api-base>/search/status` reports `"configured": true`. This response exposes no key. `GET /search` accepts only the supported category names and a query of at most 300 characters; upstream requests use a fixed SerpAPI host, a timeout, and the existing API rate limiter.

## Existing Assistant API on GitHub Pages

The existing Assistant remains available in the client at `#assistant`. Because GitHub Pages is static, its API must be separately hosted. For an HTTPS Assistant backend, set `CLIENT_ORIGIN` to the Pages site's origin and add the Actions **variable** `VITE_ASSISTANT_API_BASE` to `<assistant-backend-origin>/api`; rebuild the Pages site after changing it. This variable contains only the public API URL. Set `ASSISTANT_ACCESS_TOKEN` in the backend's secret manager and enter it in Assistant Settings; the client stores it in the current tab's `sessionStorage` and sends it only as an authorization header. The public Search-only backend does not expose the Assistant API, so it cannot also serve these Assistant requests.

When `SEARCH_ONLY=true`, the backend does not initialize the Assistant database or serve `/uploads`, `/chat`, `/agent/run`, or `/conversations`. This mode reduces the Search deployment's exposed surface; it does not add user authentication or make the search provider anonymous.

When the search backend is not reachable or has no configured key, BLUE Search does not create sample results. It may show DuckDuckGo Instant Answers for web/education queries and provides a category-appropriate external DuckDuckGo search link.

## Safe Search

The local preference defaults to enabled. The server applies SerpAPI's `safe=active` parameter for its web, education, and image engines only; the video and news engines do not receive a Safe Search parameter from this integration. DuckDuckGo Instant Answers and external search follow their own provider behavior. This is not a parental-control guarantee.

## Existing assistant web search

The pre-existing Blue Assistant has its own optional `SEARCH_PROVIDER=serpapi` configuration for its tool. Its default DuckDuckGo assistant tool is separate from BLUE Search's documented Instant Answer integration. Do not treat the assistant tool as the source of BLUE Search results.
