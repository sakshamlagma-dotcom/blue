const BASE = (import.meta.env?.VITE_ASSISTANT_API_BASE || "/api").replace(/\/+$/, "");
const ACCESS_TOKEN_KEY = "blue-assistant-access-token";

function getAccessToken() {
  try {
    return sessionStorage.getItem(ACCESS_TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

function setAccessToken(token) {
  try {
    if (token) sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
    else sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    return true;
  } catch {
    return false;
  }
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (typeof FormData === "undefined" || !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  });
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : null;
  if (!res.ok) {
    const error = new Error(data?.error || `Request failed (${res.status})`);
    error.status = res.status;
    throw error;
  }
  return data;
}

export const api = {
  getAccessToken,
  setAccessToken,
  health: () => request("/health"),

  listConversations: () => request("/conversations"),
  getConversation: (id) => request(`/conversations/${id}`),
  renameConversation: (id, title) =>
    request(`/conversations/${id}`, { method: "PATCH", body: JSON.stringify({ title }) }),
  setConversationMode: (id, mode) =>
    request(`/conversations/${id}`, { method: "PATCH", body: JSON.stringify({ mode }) }),
  deleteConversation: (id) => request(`/conversations/${id}`, { method: "DELETE" }),

  sendMessage: ({ message, conversationId, mode, attachments }) =>
    request("/chat", {
      method: "POST",
      body: JSON.stringify({ message, conversationId, mode, attachments }),
    }),

  uploadFiles: async (files) => {
    const formData = new FormData();
    for (const f of files) formData.append("files", f);
    const headers = new Headers();
    const token = getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const res = await fetch(`${BASE}/files/upload`, { method: "POST", headers, body: formData });
    const data = await res.json();
    if (!res.ok) {
      const error = new Error(data?.error || "Upload failed");
      error.status = res.status;
      throw error;
    }
    return data;
  },
};
