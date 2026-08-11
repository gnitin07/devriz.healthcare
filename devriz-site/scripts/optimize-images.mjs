/**
 * One-shot image optimizer.
 *
 * Every raster asset the site ships was authored at print-ish resolution and
 * served as-is, which is what pushed Vercel's fast-data-transfer bill up: the
 * three doctor cut-outs alone were 2574x3218 PNGs (~2 MB each) rendered into a
 * ~560px-wide slot. This script re-encodes each one to WebP at the size it is
 * actually displayed, emitting a desktop and (where useful) a mobile variant.
 *
 * Re-runnable: reads masters from image-sources/ (which sits OUTSIDE public/ so
 * Vite never copies them into dist/ and Vercel never serves them) and writes
 * the optimized results into public/.
 *
 *   node scripts/optimize-images.mjs
 */
import sharp from "sharp";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "image-sources");
const PUB = path.join(ROOT, "public");

// width: null keeps the original pixel width (already small enough).
// alpha: true = cut-out that must keep transparency.
const JOBS = [
  // ── the big three: background figure that crossfades in WhyConsultSection.
  //    Displayed ~560px wide on desktop, ~240px on mobile.
  ...["doctor-1", "doctor-2", "doctor-3"].flatMap((n) => [
    { src: `images/${n}.png`, out: `images/${n}-900.webp`, width: 900, alpha: true, q: 78 },
    { src: `images/${n}.png`, out: `images/${n}-480.webp`, width: 480, alpha: true, q: 76 },
  ]),

  // ── doctor cards (DoctorsSection) — cut-outs inside a ~380px card
  { src: "images/doctor-amy-cut.png", out: "images/doctor-amy-cut.webp", width: 700, alpha: true, q: 80 },
  { src: "images/doctor-seema.png", out: "images/doctor-seema.webp", width: null, alpha: true, q: 80 },
  { src: "images/doctor-rachita.png", out: "images/doctor-rachita.webp", width: null, alpha: true, q: 80 },

  // ── hero side illustrations (SlideVisual)
  { src: "images/hero-visual-hair.png", out: "images/hero-visual-hair.webp", width: null, alpha: true, q: 80 },
  { src: "images/hero-visual-skin.png", out: "images/hero-visual-skin.webp", width: null, alpha: true, q: 80 },
  { src: "images/hero-visual-body.png", out: "images/hero-visual-body.webp", width: null, alpha: true, q: 80 },

  // ── full-bleed hero banners (already correctly sized, just badly encoded)
  ...[
    "hero-skin-desktop-v2", "hero-skin-mobile-v2",
    "hero-hair-desktop", "hero-hair-mobile",
    "hero-body-desktop", "hero-body-mobile",
  ].map((n) => ({ src: `images/${n}.jpg`, out: `images/${n}.webp`, width: null, alpha: false, q: 72 })),

  ...[
    "hero-independence-desktop", "hero-independence-mobile"
  ].map((n) => ({ src: `images/${n}.png`, out: `images/${n}.webp`, width: null, alpha: false, q: 72 })),

  // ── WhatsApp review screenshots: a small one for the grid, a full-size one
  //    fetched only when the visitor taps to zoom.
  ...Array.from({ length: 8 }, (_, i) => i + 1).flatMap((n) => [
    { src: `images/reviews/r${n}.jpg`, out: `images/reviews/r${n}.webp`, width: 500, alpha: false, q: 74 },
    { src: `images/reviews/r${n}.jpg`, out: `images/reviews/r${n}-full.webp`, width: 1000, alpha: false, q: 78 },
  ]),

  // ── logo (the PNG stays for the face-scan PDF, which needs a raster PNG)
  { src: "images/logo-r.png", out: "images/logo-r.webp", width: null, alpha: true, q: 85 },
];

const kb = (b) => Math.round(b / 1024);

let before = 0;
let after = 0;
const rows = [];

for (const job of JOBS) {
  const src = path.join(SRC, job.src);
  const out = path.join(PUB, job.out);
  let srcSize;
  try {
    srcSize = (await stat(src)).size;
  } catch {
    console.warn(`  skip (missing): ${job.src}`);
    continue;
  }

  let img = sharp(src);
  if (job.width) img = img.resize({ width: job.width, withoutEnlargement: true });
  await img
    .webp({
      quality: job.q,
      alphaQuality: job.alpha ? 90 : 100,
      effort: 6,
      smartSubsample: true,
    })
    .toFile(out);

  const outSize = (await stat(out)).size;
  rows.push([job.out, kb(srcSize), kb(outSize)]);
  after += outSize;
}

// count each *source* once, even when it produced two variants
const counted = new Set();
for (const job of JOBS) {
  if (counted.has(job.src)) continue;
  counted.add(job.src);
  try {
    before += (await stat(path.join(SRC, job.src))).size;
  } catch {}
}

const pad = (s, n) => String(s).padEnd(n);
console.log("\n  output                                    src KB   new KB");
console.log("  " + "-".repeat(58));
for (const [name, s, o] of rows) {
  console.log(`  ${pad(name, 40)} ${pad(s, 8)} ${o}`);
}
console.log("  " + "-".repeat(58));
console.log(`  originals total: ${kb(before)} KB`);
console.log(`  optimized total: ${kb(after)} KB`);
console.log(`  saved:           ${kb(before - after)} KB  (${Math.round((1 - after / before) * 100)}%)\n`);

// sanity: nothing in public/images should still be a multi-MB file
const big = [];
for (const dir of ["images", "images/reviews"]) {
  for (const f of await readdir(path.join(PUB, dir))) {
    const p = path.join(PUB, dir, f);
    const s = await stat(p);
    if (s.isFile() && s.size > 400 * 1024) big.push(`${dir}/${f} (${kb(s.size)} KB)`);
  }
}
if (big.length) console.log("  still over 400 KB:\n   - " + big.join("\n   - ") + "\n");
