# Deployment

The Vite 7 client build requires **Node.js 20.19+ or 22.12+**. The backend runtime itself supports Node.js 18 or newer.

## GitHub Pages: static BLUE Search

The repository includes `.github/workflows/pages.yml`, which builds `client/` and deploys only its `dist/` directory. This is a static frontend deployment; GitHub Pages does not run the Express server or keep backend secrets.

1. Merge the project changes into the repository's `main` branch. The workflow runs on relevant client/workflow changes and can also be started manually from **Actions → Deploy BLUE Search to GitHub Pages → Run workflow**.
2. Open **Repository Settings → Pages** and set **Build and deployment → Source** to **GitHub Actions**.
3. Check **Actions** for the workflow's build and deploy jobs. After they finish, open the URL displayed in the Pages settings.
4. For a project site, the expected URL is `https://sakshamlagma-dotcom.github.io/blue/`. The Vite build uses relative asset paths, and the workflow publishes the generated `.nojekyll` and `404.html`.
5. To use a custom domain, configure it in Pages and add the DNS records GitHub provides. The app uses relative assets and does not require a hard-coded repository path.

This frontend deployment works without the search backend. Users can receive supported DuckDuckGo Instant Answers and follow category-specific external search links. SerpAPI-backed results and the existing Blue Assistant need a separately deployed backend.

## Optional backend for full provider results

1. Deploy `server/` to a Node.js 18+ host. GitHub Pages is not a backend host. Configure the backend for Search-only operation (`SEARCH_ONLY=true`) so the public Search API does not mount the existing Assistant, conversation, or upload endpoints.
2. Set `SERPAPI_KEY` in the host's secret manager. Never add it to the repository or frontend. `GEMINI_API_KEY` is not needed for Search-only operation.
3. Configure `CLIENT_ORIGIN` to the frontend's origin, without a path. For the default project Pages URL this is `https://sakshamlagma-dotcom.github.io`; a custom domain has its own origin.
4. Add the repository Actions **variable** `VITE_SEARCH_API_BASE` under **Settings → Secrets and variables → Actions → Variables**, with value `<backend-origin>/api` (for example `https://search-api.example.com/api`), then rerun the Pages workflow. It is a public API URL, not a credential. If it is unset, the static site still runs with Instant Answers and external search.
5. Configure the host's TLS, request logging policy, CORS, and provider quota controls. The API uses an in-memory per-process rate limiter; horizontally scaled hosts need a shared limiter store for consistent limits.
6. Check `<backend-origin>/api/search/status`, then submit a test query through the deployed site. The status response must not contain secret values.

The full Assistant server is available for local development and protected deployments. Outside loopback development, set a random `ASSISTANT_ACCESS_TOKEN` of at least 32 characters in the backend secret manager; enter the same value under **Settings → Assistant access token** in the client. Production Assistant mode fails to start without a valid-length token. Serve it only over HTTPS. This shared token gates conversations and uploads but does not isolate users from one another; use per-user identity and authorization for a multi-user deployment. See [SECURITY.md](SECURITY.md).

For Assistant use from the GitHub Pages frontend, deploy the full Assistant backend over HTTPS, set its `CLIENT_ORIGIN` to the Pages site origin, and add the Actions **variable** `VITE_ASSISTANT_API_BASE` with the backend API base (for example `https://assistant-api.example.com/api`). This is a public URL, not a credential. The Assistant UI remains available at `#assistant`; its API requests and protected uploads use this configured backend. The Search-only backend does not serve Assistant endpoints, so use separate backends or a trusted full backend when both features are required.

## Local preview

```sh
cd blue-ai-agent_1/blue/client
npm ci
npm test
npm run build
npm run preview
```

The Vite development server proxies `/api` to `http://localhost:8787`. To run backend provider tests and the backend locally:

```sh
cd blue-ai-agent_1/blue/server
npm ci
npm test
npm run dev
```

Copy `blue-ai-agent_1/blue/.env.example` to `server/.env` and add secrets only to that ignored local file or the hosting provider's secret manager. The assistant backend also depends on SQLite and file uploads; configure durable writable storage before production deployment.
