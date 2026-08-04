/**
 * Blog image compressor — runs as part of `npm run build`, twice.
 *
 * Decap writes uploads straight into public/blog-images/ at whatever size the
 * writer's camera produced. A single 4 MB header image served to 25,000
 * visitors is 100 GB — the entire monthly Vercel transfer allowance — so no
 * upload is ever served in its original form.
 *
 *   node scripts/optimize-blog-images.mjs              (before `vite build`)
 *     Re-encodes every upload into width-capped WebPs (640/960/1400, never
 *     upscaled) plus a 1200x630 JPEG for WhatsApp/Facebook link previews, and
 *     regenerates src/lib/blog-image-manifest.js, which is what the site reads.
 *
 *   node scripts/optimize-blog-images.mjs --prune-dist  (after `vite build`)
 *     Deletes the originals that Vite copied into dist/. They stay in public/
 *     so the CMS media library can still show them to writers, but they must
 *     never reach the CDN — nothing links them, and one accidental hotlink to
 *     a 4 MB file undoes the whole exercise.
 *
 * Idempotent: re-running skips anything whose variants are already newer than
 * the source, so repeated builds cost nothing and never re-compress a WebP.
 */
import sharp from "sharp";
import { readdir, readFile, stat, unlink, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { load as parseYaml } from "js-yaml";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_DIR = path.join(ROOT, "public/blog-images");
const CONTENT_DIR = path.join(ROOT, "content/blog");
const DIST_DIR = path.join(ROOT, "dist/blog-images");
const MANIFEST = path.join(ROOT, "src/lib/blog-image-manifest.js");
const URL_BASE = "/blog-images";

/** Widest is 1400: the article column is ~704px, doubled for retina screens. */
const WIDTHS = [640, 960, 1400];
const QUALITY = { 640: 70, 960: 72, 1400: 74 };

const SOURCE = /\.(jpe?g|png|webp|avif|tiff?)$/i;
/** Our own outputs, so a second run does not treat them as new uploads. */
const DERIVED = /-(\d+\.webp|og\.jpg)$/i;

/** The ratio .blog-hero-img and .blog-card render at. Keep the two in sync. */
const BANNER = 16 / 9;

const kb = (bytes) => Math.round(bytes / 1024);
const mtime = async (p) => stat(p).then((s) => s.mtimeMs, () => 0);

/**
 * Which uploads are used as a post's header image. Those are always displayed
 * as a banner, so they are cropped to that shape here rather than by CSS —
 * a 3125x3906 portrait shown in a 16:9 box means 55% of every byte the visitor
 * downloads is cropped away unseen. Images used inside the article body are not
 * in this set and keep their own proportions.
 */
async function heroImages() {
  const heroes = new Set();
  let files;
  try {
    files = await readdir(CONTENT_DIR);
  } catch {
    return heroes;
  }
  for (const file of files.filter((f) => f.endsWith(".md"))) {
    const raw = await readFile(path.join(CONTENT_DIR, file), "utf8");
    const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!m) continue;
    try {
      const image = (parseYaml(m[1]) || {}).image;
      if (typeof image === "string" && image.startsWith(`${URL_BASE}/`)) {
        heroes.add(path.posix.basename(image));
      }
    } catch {
      // a malformed post is the prerenderer's problem, not ours
    }
  }
  return heroes;
}

/**
 * The region to keep when forcing an image to the banner ratio. Tall photos are
 * cropped from the upper part of the frame rather than the middle: these are
 * face and skin close-ups, and centring a portrait crop cuts the head off.
 */
function bannerCrop(meta) {
  const ratio = meta.width / meta.height;
  if (Math.abs(ratio - BANNER) < 0.02) return null; // already a banner

  if (ratio < BANNER) {
    const height = Math.round(meta.width / BANNER);
    return {
      left: 0,
      top: Math.round((meta.height - height) * 0.25),
      width: meta.width,
      height,
    };
  }
  const width = Math.round(meta.height * BANNER);
  return {
    left: Math.round((meta.width - width) / 2),
    top: 0,
    width,
    height: meta.height,
  };
}

async function listSources() {
  let entries;
  try {
    entries = await readdir(PUBLIC_DIR, { withFileTypes: true });
  } catch {
    return []; // no uploads yet
  }
  return entries
    .filter((e) => e.isFile() && SOURCE.test(e.name) && !DERIVED.test(e.name))
    .map((e) => e.name)
    .sort();
}

async function optimize() {
  const sources = await listSources();
  const heroes = await heroImages();
  const manifest = {};
  const rows = [];
  let before = 0;
  let after = 0;

  for (const name of sources) {
    const src = path.join(PUBLIC_DIR, name);
    const stem = name.replace(/\.[^./]+$/, "");
    const srcSize = (await stat(src)).size;
    const srcTime = await mtime(src);

    const meta = await sharp(src).metadata();
    if (!meta.width) {
      console.warn(`  skip (unreadable): ${name}`);
      continue;
    }

    const crop = heroes.has(name) ? bannerCrop(meta) : null;
    const box = crop || { width: meta.width, height: meta.height };

    // Never upscale: a 900px upload gets 640 + 900, not 640 + 960 + 1400.
    const targets = [
      ...new Set([
        ...WIDTHS.filter((w) => w < box.width),
        Math.min(box.width, WIDTHS[WIDTHS.length - 1]),
      ]),
    ].sort((a, b) => a - b);

    let widest = null;
    let produced = 0;

    for (const width of targets) {
      const out = path.join(PUBLIC_DIR, `${stem}-${width}.webp`);
      if ((await mtime(out)) < srcTime) {
        let img = sharp(src);
        if (crop) img = img.extract(crop);
        await img
          .resize({ width, withoutEnlargement: true })
          .webp({
            quality: QUALITY[width] || 74,
            effort: 6,
            smartSubsample: true,
          })
          .toFile(out);
      }
      const outStat = await stat(out);
      produced += outStat.size;
      widest = { width, height: Math.round((box.height / box.width) * width) };
    }

    // Link previews: WhatsApp and Facebook are unreliable with WebP, and both
    // crop to roughly 1.91:1 anyway, so give them exactly that as a JPEG.
    let og = null;
    if (meta.width >= 600) {
      const ogPath = path.join(PUBLIC_DIR, `${stem}-og.jpg`);
      if ((await mtime(ogPath)) < srcTime) {
        await sharp(src)
          .resize({ width: 1200, height: 630, fit: "cover", position: "attention" })
          .jpeg({ quality: 74, mozjpeg: true, progressive: true })
          .toFile(ogPath);
      }
      produced += (await stat(ogPath)).size;
      og = `${URL_BASE}/${stem}-og.jpg`;
    }

    manifest[`${URL_BASE}/${name}`] = {
      widths: targets,
      width: widest.width,
      height: widest.height,
      og,
    };

    before += srcSize;
    after += produced;
    rows.push([
      name,
      kb(srcSize),
      kb(produced),
      `${targets.join("/")}${crop ? " (banner crop)" : ""}`,
    ]);
  }

  const body = Object.keys(manifest).length
    ? JSON.stringify(manifest, null, 2)
    : "{}";
  await writeFile(
    MANIFEST,
    "// GENERATED by scripts/optimize-blog-images.mjs — do not edit by hand.\n" +
      "// Maps each CMS-uploaded image to the compressed variants that get served.\n" +
      `export default ${body};\n`,
    "utf8"
  );

  if (!rows.length) {
    console.log("  blog images: none to optimize");
    return;
  }

  const pad = (s, n) => String(s).padEnd(n);
  console.log("\n  blog image                          src KB   out KB   widths");
  console.log("  " + "-".repeat(64));
  for (const [name, s, o, w] of rows) {
    console.log(`  ${pad(name, 34)} ${pad(s, 8)} ${pad(o, 8)} ${w}`);
  }
  console.log("  " + "-".repeat(64));
  console.log(
    `  ${rows.length} upload(s): ${kb(before)} KB in, ${kb(after)} KB of variants` +
      ` — visitors download the largest single variant, not the original.\n`
  );
}

/**
 * Strip the originals out of the built output. public/ keeps them (the CMS
 * media library lists whatever is in the repo), dist/ must not ship them.
 */
async function pruneDist() {
  let entries;
  try {
    entries = await readdir(DIST_DIR, { withFileTypes: true });
  } catch {
    return;
  }

  let freed = 0;
  const removed = [];
  for (const e of entries) {
    if (!e.isFile() || !SOURCE.test(e.name) || DERIVED.test(e.name)) continue;
    const p = path.join(DIST_DIR, e.name);
    freed += (await stat(p)).size;
    await unlink(p);
    removed.push(e.name);
  }

  if (removed.length) {
    console.log(
      `  pruned ${removed.length} original upload(s) from dist/blog-images (${kb(freed)} KB never leaves the repo)`
    );
  }
}

await mkdir(PUBLIC_DIR, { recursive: true });
if (process.argv.includes("--prune-dist")) await pruneDist();
else await optimize();
