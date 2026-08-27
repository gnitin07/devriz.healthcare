import { useEffect, useState } from "react";

/**
 * Where blog content comes from, on the browser side.
 *
 * It used to be `import.meta.glob("/content/blog/*.md")` — the posts were baked
 * into the JavaScript bundle at build time. That is no longer possible: posts
 * are written through /admin while the server is running, and a bundle built
 * last Tuesday cannot contain an article published this morning.
 *
 * So there are two sources, in this order:
 *
 *   1. The <script id="__BLOG__"> tag that server/prerender.mjs embeds in every
 *      /blogs page. It is read synchronously on the first render, so an article
 *      opened directly — or by a crawler — paints immediately with no fetch and
 *      no empty flash, matching the static HTML already in the document.
 *
 *   2. /api/posts.json, fetched afterwards. This is what serves client-side
 *      navigation between articles, and it quietly refreshes stale data if the
 *      page was left open while something was republished.
 *
 * Both deliver posts in exactly the same shape — the server resolves image
 * variants and rewrites body images before sending — so nothing downstream has
 * to know which one it got.
 */

const readEmbedded = () => {
  if (typeof document === "undefined") return null;
  const tag = document.getElementById("__BLOG__");
  if (!tag) return null;
  try {
    return JSON.parse(tag.textContent);
  } catch {
    return null;
  }
};

const embedded = readEmbedded();

let cache = Array.isArray(embedded?.posts) ? embedded.posts : null;
/** The article this page was prerendered for, even if it is a draft preview. */
const embeddedPost = embedded?.post || null;

let inflight = null;

function fetchPosts() {
  if (inflight) return inflight;
  inflight = fetch("/api/posts.json", { headers: { Accept: "application/json" } })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((data) => {
      cache = Array.isArray(data.posts) ? data.posts : [];
      return cache;
    })
    .catch(() => cache || [])
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Synchronous read of whatever is known right now. */
export const getPosts = () => cache || [];
export const getPost = (slug) => getPosts().find((p) => p.slug === slug) || null;

/**
 * `loading` is only ever true when there was no embedded data to start from —
 * i.e. client-side navigation. On a fresh page load it stays false, so the
 * article never flickers through an empty state it does not need.
 */
export function usePosts() {
  const [posts, setPosts] = useState(() => cache);

  useEffect(() => {
    let live = true;
    fetchPosts().then((next) => live && setPosts(next));
    return () => {
      live = false;
    };
  }, []);

  return { posts: posts || [], loading: posts === null };
}

export function usePost(slug) {
  const { posts, loading } = usePosts();
  const post =
    posts.find((p) => p.slug === slug) ||
    (embeddedPost && embeddedPost.slug === slug ? embeddedPost : null);
  return { post, loading: loading && !post };
}

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
