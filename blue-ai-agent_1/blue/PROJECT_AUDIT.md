# BLUE Search project audit

**Audit date:** 20 October 2026  
**Repository:** `sakshamlagma-dotcom/blue`  
**Inspected baseline:** branch `sakshamlagma-dotcom-blue-search-engine-bcb`, commit `a3f52e0` (same project tree as `origin/main` at `9fbfeef`)

This report follows the current implementation and its configured dependencies; a visible control is not counted as a working feature unless its code path reaches a real provider or browser capability. No live paid-provider request or backend deployment was performed for this audit.

## Feature checklist

| Area | Status | Verified behavior and limitations |
|---|---|---|
| Homepage and BLUE branding | Working | BLUE Search is the default route; the existing Assistant remains at `#assistant`. |
| Search form | Working | Keyboard/form submission, clear action, empty-query handling, and 300-character client/server bounds are present. |
| Search provider integration | Requires external API | DuckDuckGo Instant Answers are requested for web and education searches. Genuine result lists require the backend and a server-side `SERPAPI_KEY`. |
| Search result rendering | Working when a provider returns results | Provider results are normalized, unsafe URLs are excluded, untrusted titles/snippets are rendered as text, and result links use safe new-tab attributes. |
| Search suggestions | Partially working | Suggestions come from the user's local search history; no remote autocomplete endpoint or per-keystroke provider request is used. Arrow, Enter, and Escape controls are implemented. |
| AI answer in Search | Missing | Search does not generate a separate AI answer. The existing Assistant is a separate route and needs its backend plus `GEMINI_API_KEY`. |
| Existing Assistant and Gemini | Requires backend/API key | The React Assistant, agent modes, Gemini provider, conversation persistence, tools, and upload UI remain present. The server reads the key from its environment. |
| Image and news search | Requires external API | Image, video, and news categories map to fixed SerpAPI engines; they are unavailable without a configured backend/key. |
| Search filters | Partially working | Supported categories are web, images, videos, news, and education. Education currently uses ordinary Google web results, not a curated education index. |
| Pagination | Missing | The UI and search endpoint do not expose next/previous pages or provider pagination. No total-result count is fabricated. |
| Search history and bookmarks | Working | Optional query history and saved links are held in browser `localStorage`; history can be disabled/cleared, and no history API uploads them. |
| Search themes | Working | System, light, and dark themes use CSS variables; storage failures fall back to defaults. |
| Assistant theme | Partially working | Dark/light choice is persisted locally; system-theme selection is not present. Storage-blocked behavior is now handled without stopping the app. |
| Mobile layout | Implemented; device verification incomplete | Search and Assistant styles include responsive breakpoints. A systematic device/browser matrix was not run. |
| Accessibility | Partially working | Search includes semantic search controls, visible focus, keyboard suggestions, dialog focus handling, and reduced-motion CSS. Assistant settings and generated links received additional keyboard/safe-link handling in this update; no formal WCAG audit was run. |
| Loading, errors, and retry | Partially working | Search has loading, empty, provider-unavailable, and retry states; stale searches are aborted. Instant-answer fetch has no separate client timeout. Assistant has bounded agent/model steps and server request limits, but no streaming responses. |
| Rate limiting | Working with deployment limitation | Express rate limiting covers API routes. It is in-memory and per process, so multiple instances need a shared store. |
| API-key security | Working in inspected code | Gemini and SerpAPI keys are backend configuration; the public client receives only provider status and API base URLs. The Gemini key is now sent in a request header rather than the URL. No credential pattern was detected in the inspected baseline/history scan; pattern scans are not exhaustive. |
| CORS and Assistant authentication | Requires deployment configuration | CORS uses `CLIENT_ORIGIN`. Production Assistant mode requires a token of at least 32 characters, but the token is shared and does not provide per-user conversation isolation. Search-only mode avoids mounting Assistant/conversation/upload routes. |
| GitHub Pages | Working for static client | `.github/workflows/pages.yml` builds `client/` and publishes only `client/dist/`; Vite uses relative asset paths for `/blue/`. Deployment is recorded as successful for run `39371956728`. Pages cannot run Express or hold server secrets. |
| Backend availability | Cannot be verified from this repository alone | Provider base URLs and credentials are environment/Actions configuration. No live backend was tested here; Search without it retains Instant Answers where available and external-search links. |
| Performance and browser console | Partially verified | Search aborts superseded requests and result thumbnails are lazy-loaded. No production performance benchmark or browser-console inspection was performed. |
| Privacy and data retention | Documented; deployment-dependent | Search history/bookmarks are local. Assistant conversations and uploaded files are stored on the backend. A shared Assistant token permits shared access to that data; use per-user authentication/ownership before serving multiple unrelated users. |

## Incremental implementation plan

1. Preserve the Search-first route, Assistant route, current provider contracts, Pages path, and existing data stores; do not replace the project architecture.
2. Address verified security and privacy issues first: isolate untrusted tool output from follow-on network/file tools, keep provider keys out of URLs/client bundles, and avoid clearing Search data from Assistant settings. **Implemented in this update.**
3. Improve reliability and accessibility only where an actual gap was found: maintain the existing Search fallback/error states and add keyboard-accessible Assistant settings plus safe external Markdown links. **Implemented in this update.**
4. Maintain this feature checklist and test the changed paths, package audits, and static build. **Implemented and verified below.**
5. Defer features needing provider behavior or product choices—especially pagination, Search-specific AI answers, voice output, and per-user account ownership—until the integration contract and data-access model are defined. No substitute or fake results were added.

## Verified implementation changes in this audit

- Assistant tool results from web search, URL reading, and uploaded-file reading are treated as untrusted. After any such result is returned to the model, only the local calculator remains available; further file/network tool calls are rejected even if a provider returns them anyway. This reduces tool-mediated prompt-injection exfiltration but is not a substitute for per-user authorization or careful model-output review.
- Chat mode now rejects tool calls even if a provider returns them despite tools being disabled.
- Gemini API credentials are sent through `x-goog-api-key`, not placed in the request URL or body.
- Assistant theme storage failures no longer prevent rendering. Clearing the Assistant theme removes only its own preference and preserves BLUE Search history/bookmarks.
- Assistant settings now expose a labelled modal with keyboard focus handling; Assistant Markdown links are limited to credential-free HTTP(S) destinations and open with `noopener noreferrer`.

## Remaining work and deployment requirements

- Configure and deploy an HTTPS backend for full Search results (`SERPAPI_KEY`) or Assistant (`GEMINI_API_KEY`). These credentials belong only in the backend secret manager. The public Pages bundle cannot safely contain them.
- Set `VITE_SEARCH_API_BASE` and/or `VITE_ASSISTANT_API_BASE` as public API URLs in the Pages build environment when those backends are available. The default `/api` path is not a substitute for a backend on GitHub Pages.
- Use per-user authentication, conversation ownership checks, and isolated upload access before exposing the full Assistant to multiple users; the existing bearer token is shared access.
- Confirm provider terms, quotas, pricing, and any backend rate-limit/shared-storage requirements before handling public traffic. Education results are ordinary web results, and image reuse rights are determined by source publishers.
- Pagination, Search-specific AI answers, voice output, answer feedback/length controls, image analysis, and streaming are not implemented.
- Run visual browser/device checks and live provider integration tests with controlled credentials before declaring those environments verified. This audit deliberately does not make paid API calls.

## Validation performed for this update

- Client tests: **6/6 passed**.
- Server tests: **14/14 passed**, including regression tests that verify post-reader tool restrictions, Chat-mode tool isolation, and Gemini key placement.
- Client and server `npm audit`: **0 vulnerabilities** reported in each package.
- Production Vite build: **passed** in a unique temporary output directory; generated HTML references relative `./assets/` paths. The existing ignored `client/dist/` output was not overwritten.
- Browser canvas: local Search preview rendered the disconnected-backend fallback and permission-denied voice status. Browser developer-console inspection and device-size testing were not available in this check.
