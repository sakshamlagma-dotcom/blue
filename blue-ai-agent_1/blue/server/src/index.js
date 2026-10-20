import express from "express";
import cors from "cors";
import path from "node:path";
import { env, assertConfigured } from "./config/env.js";

import healthRoutes from "./routes/healthRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";
import { requireAssistantAccess } from "./middleware/assistantAuth.js";
import { apiRateLimiter } from "./middleware/rateLimiter.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(cors({ origin: env.clientOrigin, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use("/api", healthRoutes); // no rate limit on health check

if (!env.searchOnly) {
  if (env.nodeEnv === "production" && env.assistantAccessToken.length < 32) {
    throw new Error("Production Assistant mode requires an ASSISTANT_ACCESS_TOKEN of at least 32 characters.");
  }
  await import("./db/db.js");
  const [chatRoutes, conversationRoutes, uploadRoutes] = await Promise.all([
    import("./routes/chatRoutes.js"),
    import("./routes/conversationRoutes.js"),
    import("./routes/uploadRoutes.js"),
  ]);
  app.use("/uploads", apiRateLimiter, requireAssistantAccess, express.static(env.uploadDir));
  app.use("/api", apiRateLimiter, requireAssistantAccess, chatRoutes.default);
  app.use("/api", apiRateLimiter, requireAssistantAccess, conversationRoutes.default);
  app.use("/api", apiRateLimiter, requireAssistantAccess, uploadRoutes.default);
}

app.use("/api", apiRateLimiter, searchRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const warnings = assertConfigured();
for (const w of warnings) console.warn(`[Blue] WARNING: ${w}`);

app.listen(env.port, env.host, () => {
  console.log(`\n  🔵 Blue server running at http://${env.host}:${env.port}`);
  console.log(`     Mode: ${env.searchOnly ? "search-only API" : "Assistant and search API"}`);
  if (!env.searchOnly) {
    console.log(`     AI provider: ${env.aiProvider} (model: ${env.geminiModel})`);
  }
  console.log(`     Client origin (CORS): ${env.clientOrigin}\n`);
});
