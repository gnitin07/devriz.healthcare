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

import * as store from "./server/store.mjs";
import * as adminAuth from "./server/auth.mjs";
import adminApi from "./server/admin-api.mjs";
import { registerImages } from "./src/lib/blog-images.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, "dist");
const config = JSON.parse(fs.readFileSync(path.join(__dirname, "vercel.json"), "utf8"));

if (!fs.existsSync(DIST)) {
  console.error("dist/ is missing — run `npm run build` before starting the server.");
  process.exit(1);
}

// Articles live OUTSIDE this folder so a deploy cannot overwrite them; see the
// comment at the top of server/store.mjs. First boot creates that folder and
// seeds it from the repository's content/blog, so there is nothing to move by
// hand when this version goes up.
const seeded = store.ensureDataDir();
// Photos uploaded through /admin were not present when the build generated
// blog-image-manifest.js. Without this they would be served at full size.
registerImages(store.readImageIndex());

const app = express();
app.disable("x-powered-by");
// Without this, Express treats /consult and /consult/ as the same route, so the
// `/consult/ -> /consult` tidy-up redirect in vercel.json also matches /consult
// and redirects it to itself. Strict routing keeps the two distinct, which is
// how Vercel matches them.
app.set("strict routing", true);

// ---- blog admin -------------------------------------------------------------
// Replaces Decap CMS and its GitHub OAuth (api/auth.js, api/callback.js), which
// needed a GitHub account per writer, a pull request per article and a local
// rebuild per merge — and on Hostinger never worked at all, because the OAuth
// credentials were never set here. Now: one password, and Publish writes the
// live pages itself.
const admin = adminApi({ distDir: DIST });
app.use("/api/admin", admin.router);
app.get("/api/posts.json", admin.publicPosts);

// Regenerate dist/blogs from the content folder at boot. This is what makes a
// deploy safe: uploading a freshly built dist/ brings only the articles that
// existed when it was built, and this immediately puts back everything written
// since. Without it, deploying would look exactly like losing posts.
try {
  const posts = admin.publish();
  console.log(`  blog: ${posts.length} live post(s) rendered from ${store.DATA_DIR}`);
} catch (err) {
  // A broken blog must not stop the rest of the site from serving.
  console.error(`  blog: could not render pages — ${err.message}`);
}

// Uploads are written to the content folder, so they are served from there
// rather than from dist/. Ahead of express.static for that reason.
app.use(
  "/blog-images",
  express.static(store.IMAGES_DIR, {
    // Filenames carry their width (-960.webp), so a changed image is a new
    // name. Anything under this path is safe to cache hard.
    setHeaders: (res) => res.setHeader("Cache-Control", "public, max-age=31536000, immutable"),
  })
);

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
//
// vercel.json's own header objects used to carry a "//" comment key explaining
// each rule; Vercel's schema validator rejects any unrecognised property there
// (`headers[n] should NOT have additional property "//"`), which silently
// failed every deploy until it was caught. JSON has no real comment syntax, so
// that documentation lives here instead, next to the code that actually reads
// vercel.json:
//   /transformations/(.*)  — 1.6 MB across 22 files, the largest uncached
//     group on the site, so every returning visitor re-downloaded all of it.
//     Same stable-filename rule as the others: to change a transformation
//     photo, give it a new filename rather than overwriting it.
//   favicon-dh-*/site.webmanifest — small, but were refetched on every visit.
//     A week, not a year, since these are not content-hashed and do get
//     replaced in place.
//   /(.*) — global, and deliberately sets no Cache-Control: a rule matching
//     the same path with the same key would fight the immutable rules above.
//     HTML keeps Vercel's default so a deploy goes live immediately.
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

// An article URL with no prerendered page behind it: deleted, unpublished, or
// never existed. The /blogs/(.*) rewrite below would answer 200 with the app
// shell, which renders "Article not found" to a human but tells Google the page
// is alive — a soft 404, and the URL stays indexed indefinitely.
//
// That was survivable when removing a post meant a pull request and a rebuild.
// Now it is one click in /admin, so it has to return the right status. The app
// shell is still what gets sent, so the visitor sees the site's own not-found
// screen rather than a bare server error.
app.get("/blogs/:slug", (req, res, next) => {
  // Only trustworthy once the prerenderer has actually run. If rendering failed
  // at boot, dist/blogs is missing entirely and every article would 404 —
  // better to fall through and let the SPA try.
  if (!fs.existsSync(path.join(DIST, "blogs", "index.html"))) return next();
  res.status(404);
  sendShell(res, "index.html");
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
  if (seeded.posts || seeded.images) {
    console.log(`  seeded ${seeded.posts} post(s) and ${seeded.images} image(s) into ${seeded.dir}`);
  }
  // Said loudly, because the symptom otherwise is a colleague staring at a
  // login box that rejects every password they try.
  if (!adminAuth.configured()) {
    console.warn(
      "  !! /admin is UNUSABLE: no ADMIN_PASSWORD set.\n" +
        "     hPanel -> the app -> Environment variables -> ADMIN_PASSWORD=<a long password>, then restart."
    );
  }
});
