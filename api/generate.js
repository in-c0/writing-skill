const MODEL_ID = "inclusionai/ling-3.0-flash";
const MAX_PROMPT_CHARS = 30000;
const MAX_OUTPUT_TOKENS = 700;

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

export default async function handler(req, res) {
  setCors(req, res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const prompt = String(req.body?.prompt || "").trim();
  if (!prompt) {
    return res.status(400).json({ error: "Missing prompt" });
  }
  if (prompt.length > MAX_PROMPT_CHARS) {
    return res.status(400).json({ error: `Prompt is too long. Maximum ${MAX_PROMPT_CHARS.toLocaleString()} characters.` });
  }

  const token = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;
  if (!token) {
    return res.status(500).json({ error: "AI Gateway authentication is not available on this deployment." });
  }

  try {
    const upstream = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL_ID,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: MAX_OUTPUT_TOKENS,
      }),
    });

    const body = await upstream.text();
    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: "Hosted generation failed.",
        upstreamStatus: upstream.status,
        detail: body.slice(0, 1200),
      });
    }

    let data;
    try {
      data = JSON.parse(body);
    } catch {
      return res.status(502).json({ error: "AI Gateway returned an unreadable response." });
    }

    const text = data?.choices?.[0]?.message?.content;
    if (!text || typeof text !== "string") {
      return res.status(502).json({ error: "AI Gateway returned no text." });
    }

    return res.status(200).json({ text: text.trim(), model: MODEL_ID });
  } catch (error) {
    return res.status(502).json({ error: error?.message || String(error) });
  }
}
