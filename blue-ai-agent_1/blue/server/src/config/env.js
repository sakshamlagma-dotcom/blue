import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, "../../");
const nodeEnv = process.env.NODE_ENV || "development";
const host = process.env.HOST || (nodeEnv === "production" ? "0.0.0.0" : "127.0.0.1");
const assistantAccessToken = process.env.ASSISTANT_ACCESS_TOKEN || "";
const searchOnly = /^(1|true|yes)$/i.test(process.env.SEARCH_ONLY || "");
const isLoopbackHost = ["127.0.0.1", "::1", "localhost"].includes(host.toLowerCase());

function toInt(value, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

export const env = {
  port: toInt(process.env.PORT, 8787),
  nodeEnv,
  host,
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  searchOnly,
  assistantAccessToken,
  assistantAuthenticationRequired:
    !searchOnly && (Boolean(assistantAccessToken) || nodeEnv === "production" || !isLoopbackHost),

  aiProvider: process.env.AI_PROVIDER || "gemini",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  geminiModel: process.env.GEMINI_MODEL || "gemini-2.0-flash",

  searchProvider: process.env.SEARCH_PROVIDER || "duckduckgo",
  serpapiKey: process.env.SERPAPI_KEY || "",
  searchRequestTimeoutMs: Math.min(
    Math.max(toInt(process.env.SEARCH_REQUEST_TIMEOUT_MS, 10000), 1000),
    30000
  ),

  databasePath: path.resolve(serverRoot, process.env.DATABASE_PATH || "./data/blue.sqlite"),

  uploadDir: path.resolve(serverRoot, process.env.UPLOAD_DIR || "./uploads"),
  maxUploadMb: toInt(process.env.MAX_UPLOAD_MB, 15),

  agent: {
    maxSteps: toInt(process.env.AGENT_MAX_STEPS, 8),
    maxToolCalls: toInt(process.env.AGENT_MAX_TOOL_CALLS, 6),
    stepTimeoutMs: toInt(process.env.AGENT_STEP_TIMEOUT_MS, 30000),
    totalTimeoutMs: toInt(process.env.AGENT_TOTAL_TIMEOUT_MS, 120000),
  },

  rateLimit: {
    windowMs: toInt(process.env.RATE_LIMIT_WINDOW_MS, 60000),
    max: toInt(process.env.RATE_LIMIT_MAX, 30),
  },

  serverRoot,
};

export function assertConfigured() {
  const warnings = [];
  if (!env.searchOnly && env.assistantAuthenticationRequired && !env.assistantAccessToken) {
    warnings.push(
      "ASSISTANT_ACCESS_TOKEN is required when the Assistant server is reachable beyond loopback."
    );
  }
  if (env.assistantAccessToken && env.assistantAccessToken.length < 32) {
    warnings.push("ASSISTANT_ACCESS_TOKEN should be at least 32 characters.");
  }
  if (!env.searchOnly && !env.geminiApiKey && env.aiProvider === "gemini") {
    warnings.push(
      "GEMINI_API_KEY is not set. Chat/agent requests will fail until you add it to server/.env."
    );
  }
  return warnings;
}
