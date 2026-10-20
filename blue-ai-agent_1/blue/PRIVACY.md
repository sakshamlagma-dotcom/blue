# Privacy

BLUE Search is a browser-first interface, not a private search index.

- A submitted web or education query is sent to DuckDuckGo's Instant Answer API. If the server-side SerpAPI provider is configured, the same search query is also sent to that provider for requested results. Each provider handles query data under its own privacy policy and terms.
- If no full-result provider is configured, the app does not fabricate results. The user can choose an external DuckDuckGo search link, which navigates to DuckDuckGo.
- When enabled, search history and bookmarks are stored in browser `localStorage` on the current device. They are not uploaded by BLUE. The user can remove individual history entries, clear history/bookmarks, disable history, or reset local preferences in Settings. Private browsing, browser policies, or storage quotas may prevent persistence.
- Search suggestions are based on saved history only. BLUE does not send each keystroke to a suggestion service.
- Voice input appears only when the browser exposes speech recognition and starts only after the user presses the microphone button. The browser handles microphone permissions and recognition; BLUE does not record or save audio.
- The app does not add analytics. This does not cover infrastructure, browser, or search-provider logs.

Do not enter sensitive queries if you do not want them sent to the selected search provider. Clearing local data does not remove information already processed by a provider.
