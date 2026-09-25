const BASE = "/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : null;
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
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
    const res = await fetch(`${BASE}/files/upload`, { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Upload failed");
    return data;
  },
};
