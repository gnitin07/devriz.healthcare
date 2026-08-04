/**
 * Pre-deploy safety net: find every local asset path referenced anywhere in the
 * BUILT output (html + js + css + prerendered pages + content json) and assert
 * the file actually exists in dist/. Catches any path a refactor left dangling.
 */
import fs from "node:fs";
import path from "node:path";
import BLOG_IMAGES from "../src/lib/blog-image-manifest.js";

const DIST = "dist";

/**
 * The raw CMS upload is deliberately absent from dist — optimize-blog-images
 * replaced it with WebP variants and the prune step deleted it. Its path still
 * appears in the bundle (the markdown front matter is inlined there), so treat
 * it as resolved when the variants it maps to are all present.
 */
const replacedByVariants = (p) => {
  const entry = BLOG_IMAGES[p];
  if (!entry) return null;
  const stem = p.replace(/\.[^./]+$/, "");
  const files = [
    ...entry.widths.map((w) => `${stem}-${w}.webp`),
    ...(entry.og ? [entry.og] : []),
  ];
  const gone = files.filter(
    (f) => !fs.existsSync(path.join(DIST, f.replace(/^\//, "")))
  );
  return { files, gone };
};
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else files.push(p);
  }
})(DIST);

const TEXT = /\.(html|js|css|json|xml|webmanifest|yml|md)$/i;
const ASSET = /["'`(]\s*(\/(?:blog-images|images|videos|transformations|models|assets|fonts)\/[A-Za-z0-9_@./-]+?\.[a-z0-9]{2,5})(?:\?[^"'`)]*)?\s*["'`)]/gi;
const ABS = /https:\/\/devrizhealthcare\.com(\/[A-Za-z0-9_@./-]+?\.[a-z0-9]{2,5})/gi;
// srcset lists variants separated by commas, so the quoted-string pattern
// above only ever sees the last one.
const SRCSET = /["'\s,](\/(?:blog-images|images)\/[A-Za-z0-9_@./-]+?\.[a-z0-9]{2,5})\s+\d+w/gi;

const refs = new Map(); // path -> Set(source files)
for (const f of files) {
  if (!TEXT.test(f)) continue;
  const src = fs.readFileSync(f, "utf8");
  for (const re of [ASSET, ABS, SRCSET]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(src))) {
      const p = m[1];
      if (!refs.has(p)) refs.set(p, new Set());
      refs.get(p).add(path.relative(DIST, f));
    }
  }
}

const missing = [];
const ok = [];
const optimized = new Set(); // variant paths that stand in for an original
for (const [p, srcs] of [...refs].sort()) {
  const onDisk = path.join(DIST, p.replace(/^\//, ""));
  if (fs.existsSync(onDisk)) {
    ok.push([p, Math.round(fs.statSync(onDisk).size / 1024)]);
    continue;
  }

  const variants = replacedByVariants(p);
  if (variants && !variants.gone.length) {
    variants.files.forEach((f) => optimized.add(f.replace(/^\//, "")));
    continue;
  }
  missing.push([
    p,
    variants
      ? `variants missing: ${variants.gone.join(", ")}`
      : [...srcs].join(", "),
  ]);
}

console.log(`\n  referenced local assets: ${refs.size}   present: ${ok.length}   MISSING: ${missing.length}\n`);
if (missing.length) {
  console.log("  !!! DANGLING REFERENCES — DO NOT DEPLOY !!!");
  for (const [p, s] of missing) console.log(`   - ${p}\n       referenced by: ${s}`);
  process.exitCode = 1;
} else {
  console.log("  every referenced asset resolves.\n");
  for (const [p, kb] of ok) console.log(`   ${String(kb).padStart(5)} KB  ${p}`);
}

// orphans: shipped but never referenced (wasted deploy weight, not a failure)
const referenced = new Set([
  ...[...refs.keys()].map((p) => p.replace(/^\//, "")),
  ...optimized,
]);
const orphans = files
  .filter((f) => /\.(png|jpe?g|webp|gif|mp4|svg)$/i.test(f))
  .map((f) => path.relative(DIST, f).split(path.sep).join("/"))
  .filter((f) => !referenced.has(f));
if (orphans.length) {
  const tot = orphans.reduce((a, f) => a + fs.statSync(path.join(DIST, f)).size, 0);
  console.log(`\n  shipped but not referenced by code (${Math.round(tot / 1024)} KB):`);
  for (const f of orphans) console.log(`   - ${f}`);
}
