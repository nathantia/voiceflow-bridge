const flags = globalThis._vfFlags || (globalThis._vfFlags = new Map());

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const { token, action, ttlSeconds } = body;

    if (!token || action !== "show") {
      return res.status(400).json({ ok: false, error: "Missing token or invalid action" });
    }

    const ttl = Number(ttlSeconds || 300); // default 5 minutes
    flags.set(String(token), { show: true, expiresAt: Date.now() + ttl * 1000 });

    return res.json({ ok: true });
  } catch (e) {
    return res.status(400).json({ ok: false, error: "Bad JSON" });
  }
}
