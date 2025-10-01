const flags = globalThis._vfFlags || (globalThis._vfFlags = new Map());

export default async function handler(req, res) {
  const token = String(req.query.token || "");
  const entry = flags.get(token);
  const show = !!(entry && entry.show && Date.now() < entry.expiresAt);
  res.setHeader("Cache-Control", "no-store");
  return res.json({ show });
}
