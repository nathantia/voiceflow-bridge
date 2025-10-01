import express from "express";
import cors from "cors";

// In-memory store (resets when the function/container restarts).
// For demos and simple use it's fine. For production, use Redis or a KV store.
const flags = new Map();

const app = express();
app.use(cors());
app.use(express.json());

// GET /vf/status?token=XYZ
app.get("/vf/status", (req, res) => {
  const token = String(req.query.token || "");
  const entry = flags.get(token);
  const show = !!(entry && entry.show && Date.now() < entry.expiresAt);
  res.json({ show });
});

// POST /vf/toggle  { token: "...", action: "show", ttlSeconds?: 300 }
app.post("/vf/toggle", (req, res) => {
  const { token, action, ttlSeconds } = req.body || {};
  if (!token || action !== "show") {
    return res.status(400).json({ ok: false, error: "Missing token or invalid action" });
  }
  const ttl = Number(ttlSeconds || 300); // default: 5 minutes
  flags.set(String(token), { show: true, expiresAt: Date.now() + ttl * 1000 });
  res.json({ ok: true });
});

// POST /vf/clear  { token: "..." }
app.post("/vf/clear", (req, res) => {
  const { token } = req.body || {};
  if (!token) return res.status(400).json({ ok: false, error: "Missing token" });
  flags.delete(String(token));
  res.json({ ok: true });
});

// Vercel serverless handler
export default app;
