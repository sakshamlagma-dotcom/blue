# BLUE

BLUE is a small set of browser-first tools: **BLUE Search** for discovering real web results and supported instant answers, plus the existing **Blue Assistant** for chat and agent tasks.

## BLUE Search

The static React/Vite app lives in [`blue-ai-agent_1/blue/client`](blue-ai-agent_1/blue/client). It includes:

- Web, Images, Videos, News, and Education categories with truthful provider status.
- DuckDuckGo Instant Answers directly from its documented API for supported web and education queries.
- Optional SerpAPI-backed genuine results, with its API key kept on the Express server.
- DuckDuckGo external-search links when a full-search provider is not configured.
- Browser-local preferences, optional search history, bookmarks, system-aware themes, and supported browser voice search.

BLUE does not have its own web index. See the [project README](blue-ai-agent_1/blue/README.md), [API setup](blue-ai-agent_1/blue/API_SETUP.md), [deployment guide](blue-ai-agent_1/blue/DEPLOYMENT.md), [privacy notes](blue-ai-agent_1/blue/PRIVACY.md), and [security notes](blue-ai-agent_1/blue/SECURITY.md).

GitHub Pages deploys the static client only. Full provider results require an independently deployed Node backend and a server-side `SERPAPI_KEY`; neither Pages nor the client bundle can safely host that secret.

## Existing Blue Assistant

The chat and agent application remains available from the BLUE Search header under **Blue Assistant** (`#assistant`). Its React/Vite client and Express/SQLite server are in the same subproject. Follow the nested README for local development and the security guide before exposing its backend publicly.
