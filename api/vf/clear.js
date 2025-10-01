const flags = globalThis._vfFlags || (globalThis._vfFlags = new Map());

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const { token } = body;
    if (!token) return res.status(400).json({ ok: false, error: "Missing token" });

    flags.delete(String(token));
    return res.json({ ok: true });
  } catch (e) {
    return res.status(400).json({ ok: false, error: "Bad JSON" });
  }
}
