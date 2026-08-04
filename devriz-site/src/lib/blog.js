import { marked } from "marked";
import { load as parseYaml } from "js-yaml";
import { resolveImage, rewriteBodyImages } from "./blog-images.js";

/**
 * Blog content lives as markdown files in /content/blog, written through the
 * Decap CMS admin panel and merged by an owner via pull request. Reading them
 * at BUILD time (not from an API at runtime) is what lets scripts/prerender.mjs
 * emit real static HTML per post — the thing Google and the WhatsApp/Facebook
 * link-preview crawlers need, since those crawlers never run JavaScript.
 */
const files = import.meta.glob("/content/blog/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});

marked.setOptions({ gfm: true, breaks: false });

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

/** ~200 words per minute, rounded up, minimum 1. */
const readingTime = (text) =>
  Math.max(1, Math.round(text.trim().split(/\s+/).length / 200));

function parse(path, raw) {
  const slug = path.split("/").pop().replace(/\.md$/, "");
  const match = raw.match(FRONTMATTER);
  if (!match) return null;

  let data;
  try {
    data = parseYaml(match[1]) || {};
  } catch {
    // A malformed post must not take the whole blog down.
    return null;
  }

  const body = match[2] || "";
  return {
    slug,
    title: data.title || slug,
    excerpt: data.excerpt || "",
    image: data.image || null,
    // Compressed variants of data.image. Null when the post has no header
    // image; falls back to the original path for anything the optimizer has
    // not processed, including an external CDN URL pasted into the CMS.
    img: resolveImage(data.image),
    imageAlt: data.imageAlt || data.title || "",
    author: data.author || "Devriz Healthcare Team",
    date: data.date ? new Date(data.date).toISOString() : null,
    tags: Array.isArray(data.tags) ? data.tags : [],
    seoTitle: data.seoTitle || null,
    draft: data.draft === true,
    readingTime: readingTime(body),
    html: rewriteBodyImages(marked.parse(body)),
  };
}

const ALL = Object.entries(files)
  .map(([path, raw]) => parse(path, raw))
  .filter((p) => p && !p.draft)
  .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

export const getPosts = () => ALL;
export const getPost = (slug) => ALL.find((p) => p.slug === slug) || null;

/** "12 Aug 2026" — readable and unambiguous for an Indian audience. */
export function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

/**
 * The prerenderer already writes the correct tags into the static HTML. This
 * keeps them right during client-side navigation and in dev.
 */
export function setSeo({ title, description, canonical }) {
  document.title = title;

  const set = (selector, attr, value, create) => {
    if (!value) return;
    let el = document.head.querySelector(selector);
    if (!el) {
      el = create();
      document.head.appendChild(el);
    }
    el.setAttribute(attr, value);
  };

  set('meta[name="description"]', "content", description, () => {
    const m = document.createElement("meta");
    m.setAttribute("name", "description");
    return m;
  });
  set('link[rel="canonical"]', "href", canonical, () => {
    const l = document.createElement("link");
    l.setAttribute("rel", "canonical");
    return l;
  });
  set('meta[property="og:title"]', "content", title, () => {
    const m = document.createElement("meta");
    m.setAttribute("property", "og:title");
    return m;
  });
  set('meta[property="og:description"]', "content", description, () => {
    const m = document.createElement("meta");
    m.setAttribute("property", "og:description");
    return m;
  });
  set('meta[property="og:url"]', "content", canonical, () => {
    const m = document.createElement("meta");
    m.setAttribute("property", "og:url");
    return m;
  });
}
