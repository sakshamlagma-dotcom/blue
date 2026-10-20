import { timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";

export function hasValidAssistantToken(header, expectedToken) {
  if (typeof header !== "string" || !expectedToken) return false;
  const match = /^Bearer ([^\s]+)$/.exec(header);
  if (!match) return false;
  const supplied = Buffer.from(match[1]);
  const expected = Buffer.from(expectedToken);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export function createAssistantAccessMiddleware({ required, token }) {
  return (req, res, next) => {
    if (!required) return next();
    if (!token) {
      return res.status(503).json({ error: "Assistant access is not configured on this server." });
    }
    if (!hasValidAssistantToken(req.get("authorization"), token)) {
      res.set("WWW-Authenticate", 'Bearer realm="Blue Assistant"');
      return res.status(401).json({ error: "A valid Assistant access token is required." });
    }
    return next();
  };
}

export const requireAssistantAccess = createAssistantAccessMiddleware({
  required: env.assistantAuthenticationRequired,
  token: env.assistantAccessToken,
});
