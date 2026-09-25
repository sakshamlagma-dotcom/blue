export function errorHandler(err, req, res, _next) {
  // Log full technical detail server-side only.
  console.error(`[ERROR] ${req.method} ${req.path}:`, err);

  let status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500;
  let message = "Something went wrong on Blue's server. Please try again.";

  if (err.code === "MISSING_API_KEY") {
    status = 503;
    message = "Blue couldn't connect to the AI service. Please check the API configuration (GEMINI_API_KEY).";
  } else if (err.status === 429) {
    status = 429;
    message = "Blue is receiving too many requests right now. Please wait a moment and try again.";
  } else if (err.message?.includes("timed out")) {
    status = 504;
    message = "That took too long to complete. Please try again or simplify the request.";
  } else if (err.status && err.status < 500) {
    message = err.message; // validation-type errors are already user-safe
  }

  res.status(status).json({ error: message });
}

export function notFoundHandler(req, res) {
  res.status(404).json({ error: "Not found." });
}
