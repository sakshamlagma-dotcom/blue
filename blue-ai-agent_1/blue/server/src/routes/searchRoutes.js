import { Router } from "express";
import { env } from "../config/env.js";
import {
  isSearchCategory,
  searchWithSerpApi,
  SearchProviderError,
} from "../services/searchProvider.js";

const router = Router();
const MAX_QUERY_LENGTH = 300;

router.get("/search/status", (_req, res) => {
  res.json({
    provider: "SerpAPI",
    configured: Boolean(env.serpapiKey),
    supportedCategories: ["web", "education", "images", "videos", "news"],
    safeSearchCategories: ["web", "education", "images"],
  });
});

router.get("/search", async (req, res, next) => {
  const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const category = typeof req.query.category === "string" ? req.query.category : "web";
  const safeSearch = req.query.safeSearch !== "false";

  if (!query) return res.status(400).json({ error: "Enter a search query." });
  if (query.length > MAX_QUERY_LENGTH) {
    return res.status(400).json({ error: `Search queries must be ${MAX_QUERY_LENGTH} characters or fewer.` });
  }
  if (!isSearchCategory(category)) {
    return res.status(400).json({ error: "Choose a supported search category." });
  }

  try {
    const results = await searchWithSerpApi({ query, category, safeSearch });
    return res.json({ query, category, results, provider: "SerpAPI" });
  } catch (error) {
    if (error instanceof SearchProviderError) {
      return res.status(error.status).json({ error: error.message });
    }
    return next(error);
  }
});

export default router;
