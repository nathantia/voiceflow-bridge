// Single-bundle flag store that persists while the function stays warm
const flags = globalThis._vfFlags || (globalThis._vfFlags = new Map());

// Change this to lock down origins (recommended):
const ALLOWED_ORIGINS = [
  "https://dr-app-ae31e5.webflow.io",   // your Webflow site
  // "https://your-custom-domain.com",   // add production domain(s) here later
];
// Fallback when origin doesn't match (you can set to "*" during testing)
const FALLBACK_ORIGIN = "*";

function cors(res, origin) {
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "86400");
}

function json(res, code, obj, origin = FALLBACK_ORIGIN) {
  cors(res, origin);
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(obj));
}

export default async function handler(req, res) {
  const origin = (req.headers.origin && ALLOWED_ORIGINS.includes(req.headers.origin))
    ? req.headers.origin
    : FALLBACK_ORIGIN;

  // CORS preflight
  if (req.method === "OPTIONS") {
    cors(res, origin);
    res.statusCode = 204;
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const q = Object.fromEntries(url.searchParams.entries());

  // Parse JSON body if present
  let body = {};
  try {
    if (req.method !== "GET" && (req.headers["content-type"] || "").includes("application/json")) {
      const chunks = [];
      for await (const ch of req) chunks.push(ch);
      body = JSON.parse(Buffer.concat(chunks).toString() || "{}");
    }
  } catch { body = {}; }

  // Normalize inputs
  const token = String(body.token || q.token || "").trim();
  const action = String(body.action || q.action || "").toLowerCase();
  const showFlag = action === "show" || String(body.show || q.show || "").toLowerCase() === "true";
  const op = String(body.op || q.op || "").toLowerCase(); // op=status|toggle|clear
  const originForResp = origin;

  // STATUS
  if (op === "status" || (req.method === "GET" && (q.status === "1" || q.status === "true"))) {
    if (!token) return json(res, 400, { show: false, error: "Missing token" }, originForResp);
    const entry = flags.get(token);
    const show = !!(entry && entry.show && Date.now() < entry.expiresAt);
    return json(res, 200, { show }, originForResp);
  }

  // TOGGLE (SHOW)
  if (op === "toggle" || showFlag || (req.method === "POST" && action === "show")) {
    if (!token) return json(res, 400, { ok: false, error: "Missing token" }, originForResp);
    const ttl = Number(body.ttlSeconds || q.ttlSeconds || 300);
    flags.set(token, { show: true, expiresAt: Date.now() + ttl * 1000 });
    return json(res, 200, { ok: true }, originForResp);
  }

  // CLEAR
  if (op === "clear" || (req.method === "POST" && action === "clear")) {
    if (!token) return json(res, 400, { ok: false, error: "Missing token" }, originForResp);
    flags.delete(token);
    return json(res, 200, { ok: true }, originForResp);
  }

  // HELP
  return json(res, 200, {
    ok: true,
    usage: {
      status: "GET /api?op=status&token=YOUR_TOKEN",
      toggle: "POST /api { token, action:'show', ttlSeconds? }",
      clear:  "POST /api { token, action:'clear' }"
    }
  }, originForResp);
}
