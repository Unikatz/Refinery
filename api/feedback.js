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
const LIMIT_PER_HOUR = 20; // saved submissions per connection per hour
const hits = new Map(); // best-effort, per running instance

const clip = (v, n) => String(v ?? "").replace(/\r/g, "").trim().slice(0, n);
// Stop @mentions and #refs in tester text from pinging people or linking issues.
const tame = (s) => s.replace(/@/g, "@\u200b").replace(/#(\d)/g, "#\u200b$1");

// Accept the documented name plus common alternatives, and ignore stray spaces or quotes.
const readToken = () => {
  for (const k of ["FEEDBACK_GITHUB_TOKEN", "GITHUB_TOKEN", "FEEDBACK_TOKEN", "GH_TOKEN"]) {
    const v = String(process.env[k] || "").trim().replace(/^["']|["']$/g, "");
    if (v) return { token: v, name: k };
  }
  return { token: "", name: null };
};
const readRepo = () => String(process.env.FEEDBACK_REPO || "Unikatz/refinery-feedback").trim()
  .replace(/^https?:\/\/github\.com\//i, "").replace(/\.git$/i, "").replace(/\/+$/, "");
const gh = (path, token, init = {}) => fetch(`https://api.github.com${path}`, {
  ...init,
  headers: {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "refinery-feedback",
    "Content-Type": "application/json",
    ...(init.headers || {}),
  },
});

// GET /api/feedback: setup check for the product owner. Reveals no secrets.
async function status(res) {
  const { token, name } = readToken();
  const repo = readRepo();
  const out = {
    tokenFound: !!token,
    tokenSetting: name,
    repo,
    vercelEnvironment: process.env.VERCEL_ENV || "unknown",
    deployedCommit: (process.env.VERCEL_GIT_COMMIT_SHA || "").slice(0, 7) || "unknown",
  };
  if (!token) {
    out.ready = false;
    out.fix = `No token in this deployment's ${out.vercelEnvironment} environment. In Vercel → Settings → Environment Variables, add FEEDBACK_GITHUB_TOKEN with the Production box ticked, then Redeploy (new variables only apply to new deployments).`;
    return res.status(200).json(out);
  }
  try {
    const r = await gh(`/repos/${repo}`, token);
    out.repoReachable = r.ok;
    if (r.ok) {
      const j = await r.json();
      out.repoPrivate = !!j.private;
      if (j.has_issues === false) {
        out.canWriteIssues = false;
        out.ready = false;
        out.fix = `Issues are switched off for ${repo}. On GitHub open the repo → Settings → General → Features and tick Issues.`;
        return res.status(200).json(out);
      }
      // Real write test: make sure the "feedback" label exists. Needs Issues: Read and write.
      // 201 = created, 422 = already exists; both prove the token can write.
      const w = await gh(`/repos/${repo}/labels`, token, {
        method: "POST",
        body: JSON.stringify({ name: "feedback", color: "2448c9", description: "Sent from the Refinery public form" }),
      });
      out.canWriteIssues = w.status === 201 || w.status === 422;
      if (out.canWriteIssues) {
        out.ready = true;
        out.fix = null;
      } else {
        out.ready = false;
        out.githubStatus = w.status;
        out.fix = "The token can see the repo but can't write to it. Edit the token on GitHub: Permissions → Repositories → Issues must be \"Read and write\" (not Read-only). Click Update, then reload this page.";
      }
    } else {
      out.ready = false;
      out.githubStatus = r.status;
      out.fix = r.status === 401
        ? "GitHub rejected the token. It may be mistyped, expired or revoked. Create a new one and replace the Vercel value, then Redeploy."
        : `GitHub can't find ${repo} with this token. Check the repo exists with exactly this name, and that the token's Repository access includes it.`;
    }
  } catch (e) {
    out.ready = false;
    out.fix = "Couldn't reach GitHub from Vercel. Try again in a minute.";
  }
  return res.status(200).json(out);
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "GET") return status(res);
  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
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

  const ip = String(req.headers["x-vercel-forwarded-for"] || req.headers["x-real-ip"] || req.headers["x-forwarded-for"] || "")
    .split(",")[0].trim() || "unknown";
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

  const { token } = readToken();
  const repo = readRepo();
  if (!token) {
    console.error("Feedback token missing: set FEEDBACK_GITHUB_TOKEN for this environment and redeploy. Open /api/feedback for a setup check.");
    return res.status(503).json({ error: "Feedback isn't switched on yet. Please try again later." });
  }

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

  const post = (labels) => gh(`/repos/${repo}/issues`, token, {
    method: "POST",
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
      return res.status(502).json({ error: "Your feedback couldn't be saved. Please try again in a minute.", code: `github_${r.status}` });
    }
    recent.push(now); // only saved feedback counts toward the limit
    hits.set(ip, recent);
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("GitHub request error", e);
    return res.status(502).json({ error: "Your feedback couldn't be saved. Please try again in a minute." });
  }
};

module.exports.PRODUCTS = PRODUCTS;
