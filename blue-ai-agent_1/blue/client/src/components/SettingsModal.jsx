import { useEffect, useState } from "react";
import { api } from "../lib/api.js";

export default function SettingsModal({
  open,
  onClose,
  theme,
  onThemeChange,
  health,
  onAccessTokenChange,
}) {
  const [accessToken, setAccessToken] = useState("");
  const [accessTokenMessage, setAccessTokenMessage] = useState("");

  useEffect(() => {
    if (open) {
      setAccessToken(api.getAccessToken());
      setAccessTokenMessage("");
    }
  }, [open]);

  if (!open) return null;

  async function saveAccessToken() {
    const saved = api.setAccessToken(accessToken.trim());
    if (!saved) {
      setAccessTokenMessage("This browser session cannot store the access token.");
      return;
    }
    setAccessTokenMessage(
      accessToken.trim() ? "Token saved for this browser tab." : "Token cleared for this browser tab."
    );
    await onAccessTokenChange?.();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Settings</h2>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>

        <div className="settings-row">
          <span className="settings-label">Theme</span>
          <select
            className="settings-select"
            value={theme}
            onChange={(e) => onThemeChange(e.target.value)}
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </div>

        <div className="settings-row" style={{ alignItems: "flex-start", flexDirection: "column", gap: 8 }}>
          <label className="settings-label" htmlFor="assistant-access-token">Assistant access token</label>
          <div style={{ display: "flex", gap: 8, width: "100%" }}>
            <input
              id="assistant-access-token"
              className="settings-select"
              type="password"
              autoComplete="off"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="Required by protected Assistant servers"
              style={{ flex: 1, minWidth: 0 }}
            />
            <button className="settings-btn" onClick={saveAccessToken}>Save</button>
          </div>
          <span className="settings-value">
            {health?.assistantAuthenticationRequired
              ? "This server requires a token. It is kept in this tab's session storage."
              : health
                ? "This server does not require a token."
                : "A local loopback server can be used without a token."}
          </span>
          {accessTokenMessage && (
            <span className="settings-value" role="status">{accessTokenMessage}</span>
          )}
        </div>

        <div className="settings-row">
          <span className="settings-label">AI provider</span>
          <span className="settings-value">{health?.provider || "gemini"}</span>
        </div>

        <div className="settings-row">
          <span className="settings-label">Model connected</span>
          <span className="settings-value" style={{ color: health?.geminiConfigured ? "var(--success)" : "var(--error)" }}>
            {health?.geminiConfigured ? "Yes" : "No API key set"}
          </span>
        </div>

        <div className="settings-row">
          <span className="settings-label">Language</span>
          <span className="settings-value">Auto (EN / HI / Hinglish)</span>
        </div>

        <div className="settings-row">
          <span className="settings-label">Voice input/output</span>
          <span className="settings-value" style={{ color: "var(--warning)" }}>Not configured</span>
        </div>

        <div className="settings-row">
          <span className="settings-label">Image generation</span>
          <span className="settings-value" style={{ color: "var(--warning)" }}>Not configured</span>
        </div>

        <div className="settings-row">
          <span className="settings-label">Clear all local data</span>
          <button
            className="danger-btn"
            onClick={() => {
              if (confirm("This clears your locally cached theme preference. Continue?")) {
                localStorage.clear();
                location.reload();
              }
            }}
          >
            Clear
          </button>
        </div>

        <p style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: 14, lineHeight: 1.5 }}>
          Blue v1.0 — Think. Plan. Act. Conversations and messages are stored in Blue's local
          database on the server, not in your browser.
        </p>
      </div>
    </div>
  );
}
