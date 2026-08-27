import { useEffect, useRef, useState } from "react";

/**
 * "How will this actually look?" — answered without publishing anything.
 *
 * It renders inside an iframe rather than inline, because the article's styles
 * are full of `md:` breakpoints and those read the VIEWPORT, not the width of
 * the box they happen to sit in. Inline, a phone-width preview would still be
 * laid out with desktop type sizes and spacing, which is worse than no phone
 * preview at all. An iframe has a viewport of its own, so narrowing it triggers
 * the same rules a real phone would.
 *
 * The stylesheets are the ones already loaded into this page — admin/main.jsx
 * imports the site's index.css for exactly this reason — so the preview cannot
 * drift from the published article by construction.
 */

const WIDTHS = { phone: 390, desktop: 1180 };

const esc = (s = "") =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const fmtDate = (iso) => {
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
};

const readingTime = (html) =>
  Math.max(
    1,
    Math.round(
      String(html || "")
        .replace(/<[^>]+>/g, " ")
        .trim()
        .split(/\s+/)
        .filter(Boolean).length / 200
    )
  );

export default function Preview({ post, onClose }) {
  const [device, setDevice] = useState("desktop");
  const frame = useRef(null);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const doc = frame.current?.contentDocument;
    if (!doc) return;

    const styles = [...document.querySelectorAll('link[rel="stylesheet"], style')]
      .map((el) => el.outerHTML)
      .join("\n");

    const tags = (post.tags || []).length
      ? `<div class="blog-tags">${post.tags.map((t) => `<span>${esc(t)}</span>`).join("")}</div>`
      : "";

    const hero = post.image
      ? `<img class="blog-hero-img" src="${esc(post.image)}" alt="${esc(post.imageAlt || "")}" />`
      : "";

    doc.open();
    doc.write(`<!doctype html><html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />${styles}
<style>body{background:#fffdf0;margin:0;padding:2rem 0}</style>
</head><body>
<section class="blog-section"><article class="blog-article">
<a href="#" class="blog-back" onclick="return false">← All articles</a>
<header class="blog-article-head">${tags}<h1>${esc(post.title || "Untitled")}</h1>
<div class="blog-meta"><span>${esc(post.author || "")}</span><span>${fmtDate(
      post.date || new Date().toISOString()
    )}</span><span>${readingTime(post.html)} min read</span></div>
</header>
${hero}
<div class="blog-body">${post.html || "<p><em>Nothing written yet.</em></p>"}</div>
<aside class="blog-cta"><h3>Dealing with this concern yourself?</h3>
<p>Get a proper diagnosis first — talk to a Devriz expert for just ₹49.</p>
<button type="button">Book a consultation @ ₹49</button></aside>
</article></section>
</body></html>`);
    doc.close();
  }, [post, device]);

  return (
    <div className="preview-backdrop" onMouseDown={onClose}>
      <div className="preview" onMouseDown={(e) => e.stopPropagation()}>
        <header className="preview-bar">
          <strong>Preview</strong>
          <div className="preview-devices">
            {["desktop", "phone"].map((d) => (
              <button
                key={d}
                type="button"
                className={device === d ? "is-active" : ""}
                onClick={() => setDevice(d)}
              >
                {d === "desktop" ? "Desktop" : "Phone"}
              </button>
            ))}
          </div>
          <button type="button" className="btn-quiet" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="preview-stage">
          <iframe
            ref={frame}
            title="Article preview"
            style={{ width: WIDTHS[device], maxWidth: "100%" }}
          />
        </div>
      </div>
    </div>
  );
}
