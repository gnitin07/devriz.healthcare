// Node server for hosts that run an app rather than a static bundle
// (Hostinger Web Apps, Render, Railway, a VPS...). Vercel does NOT use this —
// there it keeps reading vercel.json and treating api/*.js as functions — so
// both deployment targets stay possible from one repo.
//
// Everything it needs comes OUT of vercel.json rather than being restated here.
// Two copies of 51 redirects would drift the first time someone edits one.
//
// Run: npm start   (PORT is supplied by the host; 8080 is just a local default)
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import authHandler from "./api/auth.js";
import callbackHandler from "./api/callback.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, "dist");
const config = JSON.parse(fs.readFileSync(path.join(__dirname, "vercel.json"), "utf8"));

if (!fs.existsSync(DIST)) {
  console.error("dist/ is missing — run `npm run build` before starting the server.");
  process.exit(1);
}

const app = express();
app.disable("x-powered-by");
// Without this, Express treats /consult and /consult/ as the same route, so the
// `/consult/ -> /consult` tidy-up redirect in vercel.json also matches /consult
// and redirects it to itself. Strict routing keeps the two distinct, which is
// how Vercel matches them.
app.set("strict routing", true);

// ---- API routes -------------------------------------------------------------
// The handlers are written to Vercel's (req, res) signature, which is a
// superset of Node's: setHeader/writeHead/end come from http.ServerResponse,
// and status().send() plus req.query are Express's own. So they run unmodified.
app.get("/api/auth", (req, res) => authHandler(req, res));
app.get("/api/callback", (req, res) => callbackHandler(req, res));

// ---- redirects --------------------------------------------------------------
// Vercel `source` strings are path-to-regexp, the same dialect Express 4 parses,
// so they can be handed over as-is — with ONE exception. Vercel accepts a bare
// `(.*)` capture group; the path-to-regexp 0.1.x that Express 4 bundles does
// not, and it fails SILENTLY: the route simply never matches. That quietly
// killed the four wildcard rules (/tag, /category, /author, /blog) — exactly
// the old WordPress URLs Google still has indexed — because an unmatched
// redirect falls all the way through to the SPA fallback and answers 200 with
// the homepage instead of 301-ing. Express spells the same thing `*`.
const toExpressPath = (source) => source.replace(/\(\.\*\)/g, "*");

for (const rule of config.redirects ?? []) {
  app.get(toExpressPath(rule.source), (req, res) => {
    let target = rule.destination;
    for (const [key, value] of Object.entries(req.params)) {
      target = target.replace(`:${key}`, value);
    }
    res.redirect(rule.permanent ? 301 : 302, target);
  });
}

// ---- static files -----------------------------------------------------------
// Convert each vercel.json header `source` into a RegExp so the Cache-Control
// policy is identical on both platforms — including the /transformations/ rule
// that was the whole point of the earlier fix.
const headerRules = (config.headers ?? []).map((rule) => ({
  test: new RegExp("^" + rule.source.replace(/\(\.\*\)/g, ".*") + "$"),
  headers: rule.headers,
}));

app.use(
  express.static(DIST, {
    // Directory indexes are resolved by the middleware below instead, so that
    // one code path sets the HTML headers.
    index: false,
    // serve-static's default is to answer /admin with a 301 to /admin/ because
    // dist/admin is a directory. That hijacked both /admin and /blogs before
    // they ever reached their rewrite. Vercel does no such redirect.
    redirect: false,
    setHeaders(res, filePath) {
      const url = "/" + path.relative(DIST, filePath).split(path.sep).join("/");
      for (const rule of headerRules) {
        if (rule.test.test(url)) {
          for (const h of rule.headers) res.setHeader(h.key, h.value);
        }
      }
    },
  })
);

// ---- rewrites ---------------------------------------------------------------
// Runs AFTER express.static, mirroring Vercel's order: redirects, then the
// filesystem, then rewrites. This is what makes /admin serve the CMS shell
// (dist/admin/index.html) instead of falling through to the app shell — the
// difference between a working blog editor and a blank page.
const sendShell = (res, file) => {
  res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.sendFile(path.join(DIST, file));
};

// Directory indexes, resolved before the rewrites — this is Vercel's
// "filesystem wins" step. It is what serves the CMS at /admin
// (dist/admin/index.html) and, importantly, the PRERENDERED /blogs page
// (dist/blogs/index.html) rather than the empty app shell, which is the whole
// point of `prerender-blog.mjs` running at build time.
app.get("*", (req, res, next) => {
  const candidate = path.join(DIST, req.path, "index.html");
  // path.join normalises away any ../ — confirm we are still inside dist/
  if (candidate.startsWith(DIST + path.sep) && fs.existsSync(candidate)) {
    return sendShell(res, path.relative(DIST, candidate));
  }
  next();
});

for (const rule of config.rewrites ?? []) {
  const file = rule.destination.replace(/^\//, "");
  app.get(toExpressPath(rule.source), (req, res) => sendShell(res, file));
}

// ---- SPA fallback -----------------------------------------------------------
// Anything still unmatched renders the app shell so client-side routing
// survives a hard refresh.
app.get("*", (req, res) => sendShell(res, "index.html"));

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`devriz-healthcare listening on ${port}`);
  console.log(`  ${config.redirects?.length ?? 0} redirects, ${headerRules.length} header rules from vercel.json`);
});
