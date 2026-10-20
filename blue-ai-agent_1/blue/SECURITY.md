# Security notes

## BLUE Search

- SerpAPI credentials are read only by the Express backend. The frontend only knows a non-secret API base URL and a boolean provider status.
- The search API accepts a bounded query and an allowlisted category; it makes requests only to a fixed SerpAPI host. It does not accept arbitrary URLs or act as a general proxy.
- Provider results, DuckDuckGo API fields, bookmarks, and saved links are rendered as text. Outbound links are restricted to credential-free HTTP(S) URLs and open in a new tab with `noopener noreferrer`.
- The existing API rate limiter also covers search routes. It is in-memory and per process; configure a shared store when running multiple instances.
- Browser history and bookmarks are local data and may be readable by scripts executing in the same origin. Avoid storing sensitive search terms.

## Assistant backend access

- The full Assistant API, conversation endpoints, uploads, and `/uploads` file delivery require `ASSISTANT_ACCESS_TOKEN` whenever the server is not bound to loopback. Production Assistant mode refuses to start unless this is at least 32 characters.
- Provide the same token in the Assistant's **Settings → Assistant access token** field. The browser keeps it in `sessionStorage` for the current tab; use HTTPS for every non-local deployment. Search-only mode does not mount the Assistant routes and does not require this token.
- Local development defaults to `127.0.0.1`; it may run without a token only while bound to loopback. If a token is configured, it is required even locally.
- This is a shared bearer token, not user identity or per-user authorization. Anyone with the token can access the same conversations and uploads. Do not use this mode for a multi-user service containing data that users must be isolated from; integrate account authentication and ownership checks for that deployment.

## URL reader protections

The Assistant URL reader accepts only standard-port HTTP(S) URLs, rejects credentials and private/reserved IP destinations, resolves and pins public DNS addresses for each request, revalidates each redirect, limits redirects and response size, and enforces a request timeout. This reduces SSRF exposure but does not replace network egress controls; production hosts should additionally block private and metadata networks at the network layer.

## Dependency audit

Client Vite/plugin dependencies and server document-parser dependencies were updated to address the advisories found in the initial audit. The Mammoth dependency tree pins a patched `argparse` release because Mammoth still declares the vulnerable legacy range. Re-run `npm audit` in both `client/` and `server/` when upgrading dependencies. The production Pages artifact is static and does not include Vite's development server.

GitHub Pages hosts only static files; provider credentials must never be placed in the Pages bundle. Do not put real secrets in committed files.
