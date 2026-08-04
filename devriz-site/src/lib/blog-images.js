/**
 * Read side of the blog image pipeline.
 *
 * Images arrive through the CMS at whatever size the writer's phone produced —
 * routinely 3–6 MB — and land in public/blog-images/. Serving those as-is is
 * the fastest way to burn the 100 GB/month Vercel transfer allowance, so
 * scripts/optimize-blog-images.mjs re-encodes every upload into width-capped
 * WebPs plus one small JPEG for link previews, and records the result in
 * blog-image-manifest.js.
 *
 * This module turns a manifest entry into markup attributes. It is imported by
 * BOTH the React components (through lib/blog.js) and scripts/prerender-blog.mjs
 * so the static HTML a crawler sees and the HTML React renders are identical —
 * hence plain ESM with no Vite-only APIs, and a .js manifest rather than .json
 * (Node needs an import attribute for JSON; Vite does not).
 *
 * Unknown paths — an external CDN URL, or an upload the optimizer has not seen
 * yet — pass through untouched, so a missing manifest entry degrades to the
 * original image instead of a broken one.
 */
import MANIFEST from "./blog-image-manifest.js";

/** Article body and hero sit in a max-w-3xl column: ~704px of actual pixels. */
export const HERO_SIZES = "(max-width: 832px) 100vw, 704px";

/** Cards are 3-up on desktop inside max-w-6xl, 2-up on tablet, 1-up on phone. */
export const CARD_SIZES =
  "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px";

const variant = (src, width) =>
  `${src.replace(/\.[^./]+$/, "")}-${width}.webp`;

/**
 * @returns {null | {src, srcset: string|null, width: number|null,
 *                   height: number|null, og: string}}
 */
export function resolveImage(src) {
  if (!src) return null;

  const entry = MANIFEST[src];
  if (!entry || !entry.widths?.length) {
    return { src, srcset: null, width: null, height: null, og: src };
  }

  const widest = entry.widths[entry.widths.length - 1];
  return {
    src: variant(src, widest),
    srcset: entry.widths.map((w) => `${variant(src, w)} ${w}w`).join(", "),
    width: entry.width || null,
    height: entry.height || null,
    // Link-preview crawlers are the one place WebP still bites: og gets a JPEG.
    og: entry.og || variant(src, widest),
  };
}

/** Absolute URL for og:image / JSON-LD, which crawlers require. */
export function resolveOgImage(src, site) {
  const r = resolveImage(src);
  if (!r) return null;
  return /^https?:\/\//i.test(r.og) ? r.og : `${site}${r.og}`;
}

/**
 * Rewrite the <img> tags marked produced from the article body. Writers drop
 * images mid-article through the CMS toolbar and those are just as heavy as the
 * header image, so they get the same treatment — plus the lazy/async hints and
 * intrinsic dimensions that keep the text from jumping as they load.
 */
export function rewriteBodyImages(html) {
  return html.replace(
    /<img\b([^>]*?)\ssrc="([^"]+)"([^>]*?)\/?>/gi,
    (tag, before, src, after) => {
      const r = resolveImage(src);
      if (!r || !r.srcset) return tag;

      const rest = `${before} ${after}`.replace(/\s+/g, " ").trim();
      const attrs = [
        `src="${r.src}"`,
        `srcset="${r.srcset}"`,
        `sizes="${HERO_SIZES}"`,
        r.width && `width="${r.width}"`,
        r.height && `height="${r.height}"`,
        'loading="lazy"',
        'decoding="async"',
      ]
        .filter(Boolean)
        .join(" ");

      return `<img ${rest ? `${rest} ` : ""}${attrs}>`;
    }
  );
}
