// Single-bundle flag store that persists while the function stays warm
const flags = globalThis._vfFlags || (globalThis._vfFlags = new Map());

function json(res, code, obj) {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(obj));
}

export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname; // e.g., /api
  const q = Object.fromEntries(url.searchParams.entries());

  // Parse JSON body if present
  let body = {};
  try {
    if (req.method !== "GET" && req.headers["content-type"]?.includes("application/json")) {
      const chunks = [];
      for await (const ch of req) chunks.push(ch);
      body = JSON.parse(Buffer.concat(chunks).toString() || "{}");
    }
  } catch { body = {}; }

  // Normalize inputs
  const token = String(body.token || q.token || "").trim();
  const action = String(body.action || q.action || "").toLowerCase();
  const showFlag = action === "show" || String(body.show || q.show || "").toLowerCase() === "true";
  const op = String(body.op || q.op || "").toLowerCase(); // optional: op=status|toggle|clear

  // Route by op or action
  // status
  if (op === "status" || (req.method === "GET" && (q.status === "1" || q.status === "true"))) {
    if (!token) return json(res, 400, { show: false, error: "Missing token" });
    const entry = flags.get(token);
    const show = !!(entry && entry.show && Date.now() < entry.expiresAt);
    return json(res, 200, { show });
  }

  // toggle (show)
  if (op === "toggle" || showFlag || (req.method === "POST" && action === "show")) {
    if (!token) return json(res, 400, { ok: false, error: "Missing token" });
    const ttl = Number(body.ttlSeconds || q.ttlSeconds || 300);
    flags.set(token, { show: true, expiresAt: Date.now() + ttl * 1000 });
    return json(res, 200, { ok: true });
  }

  // clear
  if (op === "clear" || (req.method === "POST" && action === "clear")) {
    if (!token) return json(res, 400, { ok: false, error: "Missing token" });
    flags.delete(token);
    return json(res, 200, { ok: true });
  }

  // Help message
  return json(res, 200, {
    ok: true,
    usage: {
      status: "GET /api?op=status&token=YOUR_TOKEN",
      toggle: "POST /api { token, action:'show', ttlSeconds? }",
      clear:  "POST /api { token, action:'clear' }"
    }
  });
}
