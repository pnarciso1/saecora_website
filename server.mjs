import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const root = path.dirname(fileURLToPath(import.meta.url));
const siteDir = path.join(root, "site");
const assetDir = path.join(root, "assets");
const port = Number(process.env.PORT || 4321);
const apiBase = (process.env.SAECORA_API_BASE_URL || "").replace(/\/$/, "");
const testflightUrl =
  process.env.SAECORA_TESTFLIGHT_URL || "https://testflight.apple.com/join/XXXXXXXX";

const pages = {
  "/": "index.html",
  "/privacy": "privacy.html",
  "/terms": "terms.html",
};

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const sports = new Set(["HYROX", "Running", "Triathlon", "Strength", "Other"]);
let sql;

function database() {
  if (!process.env.DATABASE_URL) return null;
  if (!sql) {
    sql = postgres(process.env.DATABASE_URL, {
      max: 1,
      prepare: false,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return sql;
}
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const hits = new Map();

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

function resolveInside(base, relative) {
  const full = path.resolve(base, relative);
  const rootWithSep = base.endsWith(path.sep) ? base : base + path.sep;
  if (full !== base && !full.startsWith(rootWithSep)) return null;
  return full;
}

function clientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded) return forwarded.split(",")[0].trim();
  return req.socket.remoteAddress || "unknown";
}

function limited(ip) {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const recent = (hits.get(ip) || []).filter((at) => now - at < windowMs);
  if (recent.length >= 20) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

function readBody(req, limit = 4096) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error("too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function json(res, status, payload) {
  send(res, status, JSON.stringify(payload), {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
}

function serveFile(res, file, status = 200) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    if (status === 404) {
      send(res, 404, "Not found", { "content-type": "text/plain; charset=utf-8" });
      return;
    }
    serveFile(res, path.join(siteDir, "404.html"), 404);
    return;
  }
  const ext = path.extname(file).toLowerCase();
  send(res, status, fs.readFileSync(file), {
    "content-type": types[ext] || "application/octet-stream",
    "cache-control": ext === ".html" ? "no-cache" : "public, max-age=86400",
  });
}

async function proxyCoach(res, url) {
  if (!apiBase) {
    json(res, 503, {
      error: {
        json: {
          message: "Coach reports are not configured.",
          code: -32603,
          data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 503 },
        },
      },
    });
    return;
  }
  const upstream = await fetch(`${apiBase}/api/trpc/coach.report${url.search}`, {
    headers: { accept: "application/json" },
  });
  const body = Buffer.from(await upstream.arrayBuffer());
  send(res, upstream.status, body, {
    "content-type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
}

async function saveBeta(req, res) {
  const origin = req.headers.origin;
  if (origin) {
    let allowed = false;
    try {
      allowed = new URL(origin).host === req.headers.host;
    } catch {
      json(res, 400, { error: "Enter a valid email." });
      return;
    }
    if (!allowed) {
      json(res, 403, { error: "Forbidden." });
      return;
    }
  }
  if (limited(clientIp(req))) {
    json(res, 429, { error: "Too many requests. Try again later." });
    return;
  }
  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch {
    json(res, 400, { error: "Enter a valid email." });
    return;
  }
  const email = String(payload.email || "").trim();
  const sport = String(payload.sport || "");
  if (!emailRe.test(email) || email.length > 320) {
    json(res, 400, { error: "Enter a valid email." });
    return;
  }
  if (!sports.has(sport)) {
    json(res, 400, { error: "Pick your primary sport." });
    return;
  }
  const db = database();
  if (!db) {
    json(res, 503, { error: "Signups are not configured." });
    return;
  }
  try {
    await db`
      insert into "betaSignups" ("email", "sport")
      values (${email.toLowerCase()}, ${sport})
      on conflict ("email") do update set "sport" = excluded."sport"
    `;
  } catch (error) {
    console.error("beta signup failed", error instanceof Error ? error.message : "unknown");
    json(res, 500, { error: "We couldn’t save that. Try again." });
    return;
  }
  json(res, 200, { ok: true });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const { pathname } = url;

    if (req.method === "GET" && pathname === "/site-config.js") {
      send(res, 200, `window.SAECORA=${JSON.stringify({ testflightUrl })};\n`, {
        "content-type": "text/javascript; charset=utf-8",
        "cache-control": "no-store",
      });
      return;
    }

    if (pathname === "/api/trpc/coach.report") {
      if (req.method !== "GET") {
        send(res, 405, "Method not allowed", {
          "content-type": "text/plain; charset=utf-8",
          allow: "GET",
        });
        return;
      }
      await proxyCoach(res, url);
      return;
    }

    if (pathname === "/api/beta") {
      if (req.method !== "POST") {
        send(res, 405, "Method not allowed", {
          "content-type": "text/plain; charset=utf-8",
          allow: "POST",
        });
        return;
      }
      await saveBeta(req, res);
      return;
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      send(res, 405, "Method not allowed", { "content-type": "text/plain; charset=utf-8" });
      return;
    }

    if (pathname === "/privacy/" || pathname === "/terms/" || pathname === "/index.html") {
      send(res, 301, "", { location: pathname === "/index.html" ? "/" : pathname.slice(0, -1) });
      return;
    }

    const coach = pathname.match(/^\/coach\/([A-Za-z0-9-]{4,12})\/?$/);
    if (coach) {
      if (pathname.endsWith("/")) {
        send(res, 301, "", { location: pathname.slice(0, -1) });
        return;
      }
      serveFile(res, path.join(siteDir, "coach.html"));
      return;
    }

    if (pathname === "/coach" || pathname === "/coach/") {
      serveFile(res, path.join(siteDir, "coach.html"));
      return;
    }

    if (pages[pathname]) {
      serveFile(res, path.join(siteDir, pages[pathname]));
      return;
    }

    if (pathname.startsWith("/img/")) {
      const file = resolveInside(path.join(siteDir, "img"), pathname.slice("/img/".length));
      if (!file) {
        send(res, 400, "Bad path", { "content-type": "text/plain; charset=utf-8" });
        return;
      }
      serveFile(res, file);
      return;
    }

    if (pathname.startsWith("/assets/")) {
      const file = resolveInside(assetDir, pathname.slice("/assets/".length));
      if (!file) {
        send(res, 400, "Bad path", { "content-type": "text/plain; charset=utf-8" });
        return;
      }
      serveFile(res, file);
      return;
    }

    if (pathname === "/styles.css" || pathname === "/home.js" || pathname === "/coach.js") {
      serveFile(res, path.join(siteDir, pathname.slice(1)));
      return;
    }

    serveFile(res, path.join(siteDir, "404.html"), 404);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      send(res, 500, "Something went wrong.", { "content-type": "text/plain; charset=utf-8" });
    }
  }
});

server.listen(port, () => {
  console.log(`Saecora site listening on http://localhost:${port}`);
});
