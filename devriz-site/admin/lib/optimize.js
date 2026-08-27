/**
 * Image compression, done in the browser before anything is uploaded.
 *
 * Why here and not on the server: `sharp` is a devDependency on purpose. Its
 * native binaries are unreliable to install on shared hosting, which is why
 * HOSTING.md builds locally and installs the server with `--omit=dev`. Putting
 * the resizing in the admin panel keeps that promise — the server never needs
 * an image library — and it means the writer's 6 MB phone photo is never
 * uploaded at 6 MB in the first place, which on a phone connection is the
 * difference between an upload that works and one that times out.
 *
 * Output matches what scripts/optimize-blog-images.mjs produces at build time,
 * because blog-images.js builds a srcset from the filenames by convention:
 *
 *   photo.webp            the master — stored, never served
 *   photo-640.webp        \
 *   photo-960.webp         >  the srcset the visitor actually downloads
 *   photo-1400.webp       /
 *   photo-og.jpg          1200x630, for WhatsApp and Facebook link previews
 */

/** The article column is ~704px; 1400 is that doubled for retina screens. */
export const WIDTHS = [640, 960, 1400];
const QUALITY = { 640: 0.7, 960: 0.72, 1400: 0.74 };
const MASTER_WIDTH = 1600;

/** The ratio .blog-hero-img and .blog-card render at. Keep the two in sync. */
const BANNER = 16 / 9;
const OG = { width: 1200, height: 630 };

export const MAX_BYTES = 25 * 1024 * 1024;

async function decode(file) {
  // createImageBitmap handles EXIF orientation, which <img> does not — without
  // it every photo taken in portrait on a phone arrives rotated 90°.
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      /* Safari < 15 and some HEIC-ish files: fall through */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error("That file is not an image the browser can read."));
      img.src = url;
    });
    return img;
  } finally {
    // Revoked after decode: the bitmap/image keeps its own copy of the pixels.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

const sizeOf = (source) => ({
  width: source.width || source.naturalWidth,
  height: source.height || source.naturalHeight,
});

const toDataUrl = (canvas, type, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error("The browser could not compress that image."));
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("The browser could not read that image."));
        reader.readAsDataURL(blob);
      },
      type,
      quality
    );
  });

/**
 * Draw `source` into a canvas of exactly `width`x`height`, taking `crop` from
 * the original. White underneath, so a transparent PNG exported as JPEG for the
 * link preview does not come out with a black background.
 */
function render(source, { width, height, crop }) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingQuality = "high";
  const c = crop || { left: 0, top: 0, ...sizeOf(source) };
  ctx.drawImage(source, c.left, c.top, c.width, c.height, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/**
 * The region to keep when forcing an image to a target ratio. Tall photos are
 * cropped from the upper part of the frame rather than the middle: these are
 * face and skin close-ups, and centring a portrait crop cuts the head off.
 * Mirrors bannerCrop() in scripts/optimize-blog-images.mjs.
 */
function cropTo(source, ratio) {
  const { width, height } = sizeOf(source);
  const actual = width / height;
  if (Math.abs(actual - ratio) < 0.02) return { left: 0, top: 0, width, height };

  if (actual < ratio) {
    const h = Math.round(width / ratio);
    return { left: 0, top: Math.round((height - h) * 0.25), width, height: h };
  }
  const w = Math.round(height * ratio);
  return { left: Math.round((width - w) / 2), top: 0, width: w, height };
}

/**
 * @param {File} file
 * @param {{hero?: boolean, onProgress?: (label: string) => void}} options
 *   hero — a post's header image. Cropped to the 16:9 banner the article and
 *   the blog cards both display it at, and given a link-preview JPEG. Images
 *   dropped inside an article keep their own proportions: those are often
 *   diagrams or before/after shots where cropping would lose the point.
 * @returns the payload POST /api/admin/media expects.
 */
export async function optimize(file, { hero = false, onProgress } = {}) {
  if (!file.type.startsWith("image/")) {
    throw new Error("That is not an image. Choose a JPG, PNG or WebP file.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("That image is larger than 25 MB. Please pick a smaller one.");
  }

  const step = (label) => onProgress?.(label);
  step("Reading the image…");
  const source = await decode(file);

  const crop = hero ? cropTo(source, BANNER) : { left: 0, top: 0, ...sizeOf(source) };
  const ratio = crop.width / crop.height;

  // Never upscale: a 500px-wide image asked for at 1400 would only get blurry
  // and heavier. Widths above the source are simply not produced, and
  // blog-images.js builds the srcset from whichever ones came back.
  const targets = WIDTHS.filter((w) => w <= crop.width);
  if (!targets.length) targets.push(Math.round(crop.width));

  const masterWidth = Math.min(MASTER_WIDTH, crop.width);
  step("Compressing…");
  const master = await toDataUrl(
    render(source, { width: masterWidth, height: masterWidth / ratio, crop }),
    "image/webp",
    0.85
  );

  const variants = {};
  for (const w of targets) {
    step(`Compressing… ${w}px`);
    variants[w] = await toDataUrl(
      render(source, { width: w, height: w / ratio, crop }),
      "image/webp",
      QUALITY[w] ?? 0.74
    );
  }

  let og = null;
  if (hero) {
    step("Making the WhatsApp preview…");
    // WebP still bites on link-preview crawlers, so this one is a JPEG.
    og = await toDataUrl(
      render(source, { ...OG, crop: cropTo(source, OG.width / OG.height) }),
      "image/jpeg",
      0.82
    );
  }

  source.close?.();

  return {
    name: file.name.replace(/\.[^.]+$/, "") + ".webp",
    master,
    variants,
    og,
    width: Math.round(crop.width > MASTER_WIDTH ? MASTER_WIDTH : crop.width),
    height: Math.round((crop.width > MASTER_WIDTH ? MASTER_WIDTH : crop.width) / ratio),
  };
}
