import { getVercelOidcToken } from '@vercel/oidc';

const MODEL_ID = "inclusionai/ling-3.0-flash";
const MAX_INPUT_CHARS = 30000;
const MAX_OUTPUT_TOKENS = 700;
const ALLOWED_ROLES = new Set(["system", "user", "assistant"]);

function setCors(req, res) {
  const origin = req.headers.origin || "";
  const allowed =
    origin === "https://wldud5192-writing-skill-approach-lab.hf.space" ||
    origin === "http://localhost:8000" ||
    origin === "http://127.0.0.1:8000";

  if (allowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function validateMessages(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 12) {
    throw new Error("Expected between 1 and 12 chat messages.");
  }

  let total = 0;
  const messages = value.map((message) => {
    const role = String(message?.role || "");
    const content = String(message?.content || "").trim();
    if (!ALLOWED_ROLES.has(role) || !content) {
      throw new Error("Each message needs a valid role and non-empty text content.");
    }
    total += content.length;
    return { role, content };
  });

  if (total > MAX_INPUT_CHARS) {
    throw new Error(`Input is too long. Maximum ${MAX_INPUT_CHARS.toLocaleString()} characters.`);
  }
  return messages;
}

export default async function handler(req, res) {
  setCors(req, res);

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let messages;
  try {
    messages = validateMessages(req.body?.messages);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  try {
    const token = process.env.AI_GATEWAY_API_KEY || await getVercelOidcToken();
    const upstream = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL_ID,
        messages,
        temperature: 0.2,
        max_tokens: MAX_OUTPUT_TOKENS,
        reasoning: { effort: "none" }
      })
    });

    const body = await upstream.text();
    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: "Hosted generation failed.",
        upstreamStatus: upstream.status,
        detail: body.slice(0, 1200)
      });
    }

    const data = JSON.parse(body);
    const text = data?.choices?.[0]?.message?.content;
    if (!text || typeof text !== "string") {
      return res.status(502).json({ error: "AI Gateway returned no text." });
    }

    return res.status(200).json({
      text: text.trim(),
      model: MODEL_ID
    });
  } catch (error) {
    return res.status(502).json({ error: error?.message || String(error) });
  }
}
