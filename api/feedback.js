// Public, login-free tester feedback for Refinery.
// Each valid submission becomes an issue in a private GitHub repo;
// a scheduled agent imports those issues into Refinery's Tester feedback tab.
//
// Vercel environment variables:
//   FEEDBACK_GITHUB_TOKEN  fine-grained token with Issues: read & write on the feedback repo only
//   FEEDBACK_REPO          optional, defaults to "Unikatz/refinery-feedback"

const PRODUCTS = {
  "red-flag-run": "Red Flag Run",
  "aura-isles": "Aura Isles",
  "aura-battle": "Aura Battle",
};
const KINDS = { bug: "Bug", confusing: "Confusing", idea: "Idea", praise: "Praise" };
const LIMIT_PER_HOUR = 10;
const hits = new Map(); // best-effort, per running instance

const clip = (v, n) => String(v ?? "").replace(/\r/g, "").trim().slice(0, n);
// Stop @mentions and #refs in tester text from pinging people or linking issues.
const tame = (s) => s.replace(/@/g, "@\u200b").replace(/#(\d)/g, "#\u200b$1");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Send feedback with POST." });
  }

  let b = req.body;
  if (typeof b === "string") { try { b = JSON.parse(b); } catch { b = {}; } }
  b = b || {};

  // Spam guards: hidden field filled, or form sent faster than a person could.
  if (b.website) return res.status(200).json({ ok: true });
  if (typeof b.startedAt === "number" && Date.now() - b.startedAt < 3000) {
    return res.status(200).json({ ok: true });
  }

  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 3600000);
  if (recent.length >= LIMIT_PER_HOUR) {
    return res.status(429).json({ error: "Too many submissions from this connection. Please try again in an hour." });
  }

  const product = clip(b.product, 40);
  const kind = clip(b.kind, 20);
  const title = clip(b.title, 160);
  const details = clip(b.details, 4000);
  const device = clip(b.device, 120);
  const name = clip(b.name, 60);
  let rating = parseInt(b.rating, 10);
  if (!(rating >= 1 && rating <= 5)) rating = null;

  if (!PRODUCTS[product]) return res.status(400).json({ error: "Choose which product your feedback is about." });
  if (!KINDS[kind]) return res.status(400).json({ error: "Choose what kind of feedback this is." });
  if (!title) return res.status(400).json({ error: "Add a one-line summary." });

  const token = process.env.FEEDBACK_GITHUB_TOKEN;
  const repo = process.env.FEEDBACK_REPO || "Unikatz/refinery-feedback";
  if (!token) return res.status(503).json({ error: "Feedback isn't switched on yet. Please try again later." });

  recent.push(now);
  hits.set(ip, recent);

  const data = { product, kind, title, details, device, rating, name, at: new Date().toISOString() };
  const meta = JSON.stringify(data).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");
  const body = [
    `<!-- refinery-feedback ${meta} -->`,
    `**Product:** ${PRODUCTS[product]}`,
    `**Kind:** ${KINDS[kind]}`,
    rating ? `**Rating:** ${rating}/5` : null,
    device ? `**Device:** ${tame(device)}` : null,
    `**From:** ${name ? tame(name) : "anonymous tester"}`,
    "",
    details ? tame(details) : "_No details given._",
  ].filter((x) => x !== null).join("\n");

  const post = (labels) => fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "refinery-feedback",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: `[${PRODUCTS[product]}] ${KINDS[kind]}: ${tame(title)}`,
      body,
      ...(labels ? { labels } : {}),
    }),
  });

  try {
    let r = await post(["feedback", `product:${product}`, `kind:${kind}`]);
    if (r.status === 422) r = await post(null); // labels refused: file it without them
    if (!r.ok) {
      console.error("GitHub issue create failed", r.status, await r.text().catch(() => ""));
      return res.status(502).json({ error: "Your feedback couldn't be saved. Please try again in a minute." });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("GitHub request error", e);
    return res.status(502).json({ error: "Your feedback couldn't be saved. Please try again in a minute." });
  }
};

module.exports.PRODUCTS = PRODUCTS;
