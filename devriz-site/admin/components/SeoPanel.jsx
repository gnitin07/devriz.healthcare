import { useState } from "react";

const SITE = "devrizhealthcare.com";

/**
 * What the article will look like in a Google result and in a WhatsApp share,
 * shown while it is being written.
 *
 * This is the panel from the WordPress setup the site used to run on, kept
 * because it does something no field label can: it makes the consequence of a
 * too-long title or a missing summary visible before publishing rather than a
 * week later in Search Console.
 */

/** Google truncates by pixel width, but characters are close enough to steer by. */
const LIMITS = {
  title: { good: 60, max: 70 },
  description: { good: 155, max: 170 },
};

const Counter = ({ value, limit }) => {
  const n = value.length;
  const state = n === 0 ? "empty" : n > limit.max ? "over" : n > limit.good ? "warn" : "ok";
  return (
    <span className={`counter is-${state}`}>
      {n} / {limit.good}
      {state === "over" && " — Google will cut this off"}
    </span>
  );
};

export default function SeoPanel({ post, onChange }) {
  const [open, setOpen] = useState(true);

  const title = post.seoTitle || post.title || "";
  const description = post.seoDescription || post.excerpt || "";
  const url = `${SITE} › blogs › ${post.slug || "…"}`;

  return (
    <section className="panel">
      <button type="button" className="panel-head" onClick={() => setOpen(!open)}>
        <span>Search &amp; sharing</span>
        <span className="panel-toggle">{open ? "▾" : "▸"}</span>
      </button>

      {open && (
        <div className="panel-body">
          <div className="serp">
            <div className="serp-site">
              <span className="serp-favicon">D</span>
              <div>
                <div className="serp-name">Devriz Healthcare</div>
                <div className="serp-url">{url}</div>
              </div>
            </div>
            <div className="serp-title">
              {title ? `${title} | Devriz Healthcare` : "Your headline appears here"}
            </div>
            <div className="serp-desc">
              {description ||
                "Write a short summary and Google will show it here. Leave it empty and Google picks a sentence from the article itself — usually not the one you would have chosen."}
            </div>
          </div>

          <label>
            <span className="label-row">
              Google headline
              <Counter value={title} limit={LIMITS.title} />
            </span>
            <input
              type="text"
              value={post.seoTitle || ""}
              placeholder={post.title || "Same as the post title"}
              onChange={(e) => onChange({ seoTitle: e.target.value })}
            />
          </label>
          <p className="hint">
            Leave empty to use the post title. Fill it in only when the headline
            on the page should read differently from the one in Google.
          </p>

          <label>
            <span className="label-row">
              Google description
              <Counter value={description} limit={LIMITS.description} />
            </span>
            <textarea
              rows={3}
              value={post.seoDescription || ""}
              placeholder={post.excerpt || "Same as the short summary"}
              onChange={(e) => onChange({ seoDescription: e.target.value })}
            />
          </label>
          <p className="hint">
            Leave empty to use the short summary above. This is also the text
            that appears under the link when the article is shared on WhatsApp.
          </p>
        </div>
      )}
    </section>
  );
}
