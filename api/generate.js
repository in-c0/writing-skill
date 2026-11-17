import { getVercelOidcToken } from "@vercel/oidc";

// Model and generation settings are fixed server-side. Visitors cannot pick a model.
const MODEL_ID = "inclusionai/ling-3.0-flash";
const MAX_OUTPUT_TOKENS = 700;
const TEMPERATURE = 0.2;

// Input limits. The Draft → review stage sends SKILL.md + CHECKLIST.md (~23k chars)
// plus the brief and the baseline draft, so the character cap needs headroom above that.
const MAX_BODY_BYTES = 96 * 1024;
const MAX_INPUT_CHARS = 40000;
const MAX_MESSAGES = 12;
const ALLOWED_ROLES = new Set(["system", "user", "assistant"]);

// Keep the upstream call inside the function's maxDuration (30 s in vercel.json).
const UPSTREAM_TIMEOUT_MS = 25000;

// Browser origins that may call this endpoint.
// Hugging Face serves static Spaces from <owner>-<space>.static.hf.space. The plain
// .hf.space host is kept in case Hugging Face changes how it hosts static Spaces.
// ALLOWED_ORIGINS (comma-separated) can extend this list without a code change.
const ALLOWED_ORIGINS = new Set([
  "https://wldud5192-writing-skill-approach-lab.static.hf.space",
  "https://wldud5192-writing-skill-approach-lab.hf.space",
  ...(process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
]);
const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

// Best-effort rate limit per client IP. State lives in the function instance, so it
// resets on cold starts and is not shared across regions. It still blunts bursts from
// a single client without requiring sign-in or an external store.
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX_REQUESTS = 30;
const rateBuckets = new Map();

function isAllowedOrigin(origin) {
  return ALLOWED_ORIGINS.has(origin) || LOCAL_ORIGIN.test(origin);
}

function setCors(req, res) {
  const origin = req.headers.origin || "";
  const allowed = isAllowedOrigin(origin);
  if (allowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Expose-Headers", "Retry-After");
  res.setHeader("Access-Control-Max-Age", "86400");
  return allowed;
}

function clientIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "");
  return forwarded.split(",")[0].trim() || req.socket?.remoteAddress || "unknown";
}

function rateLimited(ip) {
  const now = Date.now();
  let bucket = rateBuckets.get(ip);
  if (!bucket || now - bucket.start > RATE_WINDOW_MS) {
    bucket = { start: now, count: 0 };
    rateBuckets.set(ip, bucket);
  }
  bucket.count += 1;
  if (rateBuckets.size > 5000) {
    for (const [key, value] of rateBuckets) {
      if (now - value.start > RATE_WINDOW_MS) rateBuckets.delete(key);
    }
  }
  return bucket.count > RATE_MAX_REQUESTS;
}

function fail(res, status, code, error, extra = {}) {
  return res.status(status).json({ error, code, ...extra });
}

function parseBody(req) {
  const declared = Number(req.headers["content-length"] || 0);
  if (declared > MAX_BODY_BYTES) {
    throw Object.assign(new Error(`Request body is too large. Maximum ${MAX_BODY_BYTES} bytes.`), {
      status: 413,
      code: "payload_too_large"
    });
  }
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (_) {
      throw Object.assign(new Error("Request body must be JSON."), { status: 400, code: "bad_request" });
    }
  }
  if (!body || typeof body !== "object") {
    throw Object.assign(new Error("Request body must be a JSON object with a messages array."), {
      status: 400,
      code: "bad_request"
    });
  }
  return body;
}

function validateMessages(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_MESSAGES) {
    throw Object.assign(new Error(`Expected between 1 and ${MAX_MESSAGES} chat messages.`), {
      status: 400,
      code: "bad_request"
    });
  }

  let total = 0;
  const messages = value.map((message) => {
    const role = typeof message?.role === "string" ? message.role : "";
    const content = typeof message?.content === "string" ? message.content.trim() : "";
    if (!ALLOWED_ROLES.has(role) || !content) {
      throw Object.assign(new Error("Each message needs a role of system, user, or assistant and non-empty text content."), {
        status: 400,
        code: "bad_request"
      });
    }
    total += content.length;
    return { role, content };
  });

  if (total > MAX_INPUT_CHARS) {
    throw Object.assign(new Error(`Input is too long. Maximum ${MAX_INPUT_CHARS.toLocaleString()} characters across all messages.`), {
      status: 413,
      code: "payload_too_large"
    });
  }
  return messages;
}

// Pull a short, human-readable message out of an AI Gateway error body without
// forwarding the whole provider response to the browser.
function upstreamDetail(body) {
  try {
    const data = JSON.parse(body);
    const message = data?.error?.message || data?.message || data?.error;
    if (typeof message === "string" && message.trim()) return message.trim().slice(0, 300);
  } catch (_) {}
  return String(body || "").replace(/\s+/g, " ").trim().slice(0, 300);
}

function upstreamFailure(res, status, body) {
  const detail = upstreamDetail(body);
  if (status === 401 || status === 403) {
    return fail(res, 502, "upstream_auth", "The API could not authenticate with Vercel AI Gateway.", {
      upstreamStatus: status,
      detail
    });
  }
  if (status === 429) {
    return fail(res, 429, "upstream_rate_limited", "The hosted model is rate limited right now. Wait a few minutes and try again.", {
      upstreamStatus: status,
      detail
    });
  }
  if (status === 402) {
    return fail(res, 503, "upstream_quota", "The hosted model is out of credits.", {
      upstreamStatus: status,
      detail
    });
  }
  if (status === 400 || status === 404 || status === 422) {
    return fail(res, 502, "upstream_rejected", "Vercel AI Gateway rejected the request.", {
      upstreamStatus: status,
      detail
    });
  }
  return fail(res, 502, "upstream_error", "The hosted model returned an error.", {
    upstreamStatus: status,
    detail
  });
}

export default async function handler(req, res) {
  const originAllowed = setCors(req, res);

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return fail(res, 405, "method_not_allowed", "Use POST.");

  // Browsers only send Origin on cross-site requests. A request with an Origin we do not
  // recognise gets an explicit JSON refusal so the failure is visible in server logs and
  // to anyone testing with curl, instead of an opaque CORS error.
  if (req.headers.origin && !originAllowed) {
    return fail(res, 403, "origin_not_allowed", "This origin is not allowed to call the playground API.");
  }

  if (rateLimited(clientIp(req))) {
    res.setHeader("Retry-After", String(Math.ceil(RATE_WINDOW_MS / 1000)));
    return fail(res, 429, "rate_limited", "Too many requests from this network. Wait a few minutes and try again.");
  }

  let messages;
  try {
    messages = validateMessages(parseBody(req).messages);
  } catch (error) {
    return fail(res, error.status || 400, error.code || "bad_request", error.message);
  }

  let token;
  try {
    token = process.env.AI_GATEWAY_API_KEY || (await getVercelOidcToken());
  } catch (error) {
    return fail(res, 502, "upstream_auth", "The API could not obtain a Vercel AI Gateway credential.", {
      detail: String(error?.message || error).slice(0, 300)
    });
  }

  let upstream;
  let body;
  try {
    upstream = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL_ID,
        messages,
        temperature: TEMPERATURE,
        max_tokens: MAX_OUTPUT_TOKENS,
        reasoning: { effort: "none" }
      }),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
    });
    body = await upstream.text();
  } catch (error) {
    if (error?.name === "TimeoutError" || error?.name === "AbortError") {
      return fail(res, 504, "upstream_timeout", "The hosted model took too long to respond.");
    }
    return fail(res, 502, "upstream_error", "Could not reach Vercel AI Gateway.", {
      detail: String(error?.message || error).slice(0, 300)
    });
  }

  if (!upstream.ok) {
    // AI Gateway sometimes says how long to wait; pass that on so the page can show it.
    const retryAfter = upstream.headers.get("retry-after");
    if (retryAfter) res.setHeader("Retry-After", retryAfter);
    return upstreamFailure(res, upstream.status, body);
  }

  let text;
  try {
    const data = JSON.parse(body);
    text = data?.choices?.[0]?.message?.content;
  } catch (_) {
    return fail(res, 502, "malformed_response", "Vercel AI Gateway returned an unreadable response.");
  }
  if (typeof text !== "string" || !text.trim()) {
    return fail(res, 502, "empty_response", "The hosted model returned no text.");
  }

  return res.status(200).json({ text: text.trim(), model: MODEL_ID });
}
