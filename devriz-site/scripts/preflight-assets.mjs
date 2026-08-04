/**
 * Pre-deploy safety net: find every local asset path referenced anywhere in the
 * BUILT output (html + js + css + prerendered pages + content json) and assert
 * the file actually exists in dist/. Catches any path a refactor left dangling.
 */
import fs from "node:fs";
import path from "node:path";

const DIST = "dist";
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else files.push(p);
  }
})(DIST);

const TEXT = /\.(html|js|css|json|xml|webmanifest|yml|md)$/i;
const ASSET = /["'`(]\s*(\/(?:images|videos|transformations|models|assets|fonts)\/[A-Za-z0-9_@./-]+?\.[a-z0-9]{2,5})(?:\?[^"'`)]*)?\s*["'`)]/gi;
const ABS = /https:\/\/devrizhealthcare\.com(\/[A-Za-z0-9_@./-]+?\.[a-z0-9]{2,5})/gi;

const refs = new Map(); // path -> Set(source files)
for (const f of files) {
  if (!TEXT.test(f)) continue;
  const src = fs.readFileSync(f, "utf8");
  for (const re of [ASSET, ABS]) {
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
for (const [p, srcs] of [...refs].sort()) {
  const onDisk = path.join(DIST, p.replace(/^\//, ""));
  if (fs.existsSync(onDisk)) {
    ok.push([p, Math.round(fs.statSync(onDisk).size / 1024)]);
  } else {
    missing.push([p, [...srcs].join(", ")]);
  }
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
const referenced = new Set([...refs.keys()].map((p) => p.replace(/^\//, "")));
const orphans = files
  .filter((f) => /\.(png|jpe?g|webp|gif|mp4|svg)$/i.test(f))
  .map((f) => path.relative(DIST, f).split(path.sep).join("/"))
  .filter((f) => !referenced.has(f));
if (orphans.length) {
  const tot = orphans.reduce((a, f) => a + fs.statSync(path.join(DIST, f)).size, 0);
  console.log(`\n  shipped but not referenced by code (${Math.round(tot / 1024)} KB):`);
  for (const f of orphans) console.log(`   - ${f}`);
}
