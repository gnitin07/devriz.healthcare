import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import RichEditor, { IMAGE_SIZES, IMAGE_ALIGNMENTS } from "./RichEditor";
import SeoPanel from "./SeoPanel";
import Preview from "./Preview";
import { api } from "../api";
import { slugify, slugifyLive } from "../lib/slug";
import { optimize } from "../lib/optimize";

const BLANK = {
  slug: "",
  title: "",
  excerpt: "",
  image: null,
  imageAlt: "",
  tags: [],
  author: "Devriz Healthcare Team",
  date: null,
  seoTitle: "",
  seoDescription: "",
  draft: true,
  html: "",
};

const EXCERPT = { good: 150, max: 200, min: 40 };

/**
 * A text field whose stored value is a tidied-up version of what was typed.
 *
 * Feeding the tidied value straight back into a controlled input eats whatever
 * character triggered the tidying. Typing a comma in the tags box produced an
 * empty final tag, which was filtered out, so the comma disappeared as fast as
 * it was typed — the tags field could not be used at all. The slug box had the
 * same fault with hyphens.
 *
 * So: while the field has focus it shows exactly what was typed, and the parsed
 * value is still reported upward on every keystroke. On blur the display snaps
 * to the canonical form.
 */
function NormalisingInput({ value, format, parse, normalise, onChange, ...rest }) {
  const [text, setText] = useState(() => format(value));
  const [editing, setEditing] = useState(false);
  const shown = format(value);

  // Re-sync when the value changes from outside — loading a different post, or
  // the slug following the title. Never while the field is being typed in.
  useEffect(() => {
    if (!editing) setText(shown);
  }, [shown, editing]);

  return (
    <input
      {...rest}
      type="text"
      value={editing ? text : shown}
      onFocus={() => {
        setEditing(true);
        setText(shown);
      }}
      onChange={(e) => {
        const raw = normalise ? normalise(e.target.value) : e.target.value;
        setText(raw);
        onChange(parse(raw));
      }}
      onBlur={() => setEditing(false)}
    />
  );
}

const parseTags = (text) =>
  text
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

/**
 * Properties of the picture currently selected in the article.
 *
 * It sits at the TOP of the side column, above everything else, and only while
 * a picture is selected — the previous version put these controls in a strip
 * under the article body, where they were easy to miss and easy to scroll past
 * without ever noticing an image had a description field at all.
 */
function ImagePanel({ image, onChange, onRemove }) {
  return (
    <section className="panel panel-accent">
      <div className="panel-head static">Selected picture</div>
      <div className="panel-body">
        <img className="hero-thumb" src={image.src} alt="" />

        <label>
          Image description (alt text)
          <input
            type="text"
            autoFocus
            value={image.alt || ""}
            placeholder="e.g. close-up of dark patches on a woman’s cheek"
            onChange={(e) => onChange({ alt: e.target.value })}
          />
        </label>
        <p className="hint">
          Say what is in the photo, not “pigmentation image”. Google Images reads
          this, screen readers read it aloud, and it shows if the picture fails
          to load.{" "}
          {!String(image.alt || "").trim() && (
            <strong className="warn">Still empty.</strong>
          )}
        </p>

        <label>Size</label>
        <div className="seg">
          {IMAGE_SIZES.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={image.size === value ? "is-active" : ""}
              onClick={() => onChange({ size: value })}
            >
              {label}
            </button>
          ))}
        </div>

        <label>Position</label>
        <div className="seg">
          {IMAGE_ALIGNMENTS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={image.align === value ? "is-active" : ""}
              onClick={() => onChange({ align: value })}
            >
              {label}
            </button>
          ))}
        </div>

        <button type="button" className="btn-quiet danger full" onClick={onRemove}>
          Remove this picture
        </button>
      </div>
    </section>
  );
}

export default function PostEditor({ slug, onDone, onToast }) {
  const isNew = !slug;
  const [post, setPost] = useState(isNew ? BLANK : null);
  const [loadError, setLoadError] = useState(null);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [uploading, setUploading] = useState(null);
  /** Once the address is set by hand it stops following the title. */
  const slugLocked = useRef(!isNew);
  const heroInput = useRef(null);
  const observerRef = useRef(null);
  /** The image currently selected in the article, edited in the side panel. */
  const [selectedImage, setSelectedImage] = useState(null);
  /** The TipTap instance, so the side panel can act on the selected picture. */
  const editorRef = useRef(null);

  const updateImage = (attrs) => {
    editorRef.current?.chain().focus().updateAttributes("image", attrs).run();
    setSelectedImage((prev) => (prev ? { ...prev, ...attrs } : prev));
    setDirty(true);
  };

  const removeImage = () => {
    editorRef.current?.chain().focus().deleteSelection().run();
    setSelectedImage(null);
    setDirty(true);
  };

  /**
   * The formatting toolbar sticks directly below the action bar, so it needs
   * the bar's exact height. Measured rather than assumed: the bar wraps to two
   * rows on a narrow window, and a hard-coded value leaves the toolbar either
   * overlapping it or floating below a gap.
   *
   * A callback ref rather than an effect: on first render `post` is still
   * loading and the bar is not in the DOM at all, so a mount effect would find
   * nothing and never run again.
   */
  const measureBar = useCallback((bar) => {
    observerRef.current?.disconnect();
    if (!bar) return;
    const apply = () =>
      document.documentElement.style.setProperty(
        "--editor-bar-h",
        `${bar.getBoundingClientRect().height}px`
      );
    apply();
    observerRef.current = new ResizeObserver(apply);
    observerRef.current.observe(bar);
  }, []);

  useEffect(() => () => observerRef.current?.disconnect(), []);

  useEffect(() => {
    if (isNew) return;
    let live = true;
    api
      .post(slug)
      .then((d) => live && setPost({ ...BLANK, ...d.post }))
      .catch((e) => live && setLoadError(e.message));
    return () => {
      live = false;
    };
  }, [slug, isNew]);

  // A half-written article is the one thing here that cannot be recovered — it
  // has never touched the server. Worth interrupting a stray tab close for.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const change = (patch) =>
    setPost((prev) => {
      const next = { ...prev, ...patch };
      if (patch.title !== undefined && !slugLocked.current) next.slug = slugify(patch.title);
      return next;
    });

  const touch = (patch) => {
    setDirty(true);
    setError(null);
    change(patch);
  };

  const save = async (draft) => {
    setBusy(draft ? "Saving…" : "Publishing…");
    setError(null);
    try {
      const body = { ...post, draft, slug: slugify(post.slug || post.title) };
      const res = await api.savePost(isNew ? null : slug, body);
      setDirty(false);
      // Publishing is never refused any more, so the advice has to arrive
      // somewhere — after the fact rather than as a locked button.
      const notes = res.warnings?.length ? ` Worth fixing: ${res.warnings.join("; ")}.` : "";
      onToast(
        draft
          ? "Saved as a draft. It is not on the website yet."
          : `Published — it is live now at /blogs/${res.post.slug}.${notes}`
      );
      onDone(res.post.slug);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  };

  const pickHero = async (file) => {
    if (!file) return;
    try {
      const payload = await optimize(file, { hero: true, onProgress: setUploading });
      setUploading("Uploading…");
      const saved = await api.upload(payload);
      touch({ image: saved.url });
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(null);
    }
  };

  /**
   * Advice, not gates. Only a title is genuinely required — the post's file and
   * its web address are named after it. Everything else is shown so the writer
   * knows what they are giving up, and then it is their call: a tool that
   * refuses to publish is a tool people find ways around.
   */
  const missing = useMemo(() => {
    if (!post) return [];
    const out = [];
    if (!post.excerpt?.trim()) out.push("a short summary");
    if (!post.image) out.push("a header image");
    else if (!post.imageAlt?.trim()) out.push("a description of the header image");
    const noAlt = String(post.html || "").match(
      /<img\b(?![^>]*\balt\s*=\s*"[^"]*[^"\s][^"]*")[^>]*>/gi
    );
    if (noAlt) out.push(`a description on ${noAlt.length} image(s) in the article`);
    return out;
  }, [post]);

  if (loadError) {
    return (
      <div className="pane">
        <p className="error">{loadError}</p>
        <button className="btn-quiet" onClick={() => onDone()}>
          ← Back to all posts
        </button>
      </div>
    );
  }
  if (!post) return <div className="pane">Loading…</div>;

  // The only thing that can genuinely stop a publish.
  const canPublish = Boolean(post.title?.trim());

  return (
    <div className="editor-page">
      <header className="editor-bar" ref={measureBar}>
        <button
          className="btn-quiet"
          onClick={() => {
            if (dirty && !confirm("You have unsaved changes. Leave anyway?")) return;
            onDone();
          }}
        >
          ← All posts
        </button>

        <span className={`pill ${post.draft ? "pill-draft" : "pill-live"}`}>
          {post.draft ? "Draft" : "Live"}
        </span>
        {dirty && <span className="unsaved">Unsaved changes</span>}

        <div className="editor-bar-actions">
          <button className="btn-quiet" onClick={() => setPreviewing(true)}>
            Preview
          </button>
          <button className="btn-quiet" disabled={!!busy} onClick={() => save(true)}>
            {busy === "Saving…" ? busy : "Save draft"}
          </button>
          <button
            className="btn-primary"
            disabled={!!busy || !canPublish}
            title={canPublish ? "" : "Give the post a title first"}
            onClick={() => save(false)}
          >
            {busy === "Publishing…" ? busy : post.draft ? "Publish" : "Update"}
          </button>
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      <div className="editor-grid">
        <div className="editor-main">
          <input
            className="title-input"
            type="text"
            value={post.title}
            placeholder="Your headline — e.g. Why does acne keep coming back?"
            onChange={(e) => touch({ title: e.target.value })}
          />

          <div className="slug-row">
            <span className="slug-prefix">devrizhealthcare.com/blogs/</span>
            <NormalisingInput
              className="slug-input"
              placeholder="web-address"
              value={post.slug}
              format={(v) => v || ""}
              normalise={slugifyLive}
              parse={slugify}
              onChange={(slug) => {
                slugLocked.current = true;
                touch({ slug });
              }}
            />
          </div>
          {!post.draft && slugLocked.current && (
            <p className="hint warn-hint">
              Changing the address of a live post breaks any link to the old one
              — including anything already shared on WhatsApp or ranked in Google.
            </p>
          )}

          <RichEditor
            value={post.html}
            onChange={(html) => change({ html })}
            onDirty={() => setDirty(true)}
            onEditor={(e) => (editorRef.current = e)}
            onSelectImage={setSelectedImage}
          />
        </div>

        <aside className="editor-side">
          {selectedImage && (
            <ImagePanel
              image={selectedImage}
              onChange={updateImage}
              onRemove={removeImage}
            />
          )}

          <section className="panel">
            <div className="panel-head static">Header image</div>
            <div className="panel-body">
              {post.image ? (
                <>
                  <img className="hero-thumb" src={post.image} alt="" />
                  <div className="row">
                    <button className="btn-quiet" onClick={() => heroInput.current?.click()}>
                      Replace
                    </button>
                    <button className="btn-quiet" onClick={() => touch({ image: null })}>
                      Remove
                    </button>
                  </div>
                </>
              ) : (
                <button className="dropzone" onClick={() => heroInput.current?.click()}>
                  {uploading || "Choose a photo"}
                </button>
              )}
              <input
                ref={heroInput}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  pickHero(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <p className="hint">
                Shown at the top of the article, on the blog list, and in the
                WhatsApp link preview. Upload it at any size — it is shrunk
                automatically before it is sent.
              </p>

              <label>
                Image description (alt text)
                <input
                  type="text"
                  value={post.imageAlt}
                  placeholder="e.g. close-up of dark patches on a woman’s cheek"
                  onChange={(e) => touch({ imageAlt: e.target.value })}
                />
              </label>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head static">Short summary</div>
            <div className="panel-body">
              <textarea
                rows={4}
                value={post.excerpt}
                placeholder="One or two sentences describing what the reader will learn."
                onChange={(e) => touch({ excerpt: e.target.value })}
              />
              <span
                className={`counter is-${
                  post.excerpt.length === 0
                    ? "empty"
                    : post.excerpt.length < EXCERPT.min || post.excerpt.length > EXCERPT.max
                      ? "warn"
                      : "ok"
                }`}
              >
                {post.excerpt.length} / {EXCERPT.good} characters
              </span>
              <p className="hint">
                The grey text under your headline in Google, and the text shown
                when the link is shared on WhatsApp.
              </p>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head static">Details</div>
            <div className="panel-body">
              <label>
                Tags
                <NormalisingInput
                  placeholder="acne, pigmentation, hair fall"
                  value={post.tags}
                  format={(tags) => tags.join(", ")}
                  parse={parseTags}
                  onChange={(tags) => touch({ tags })}
                />
              </label>
              <p className="hint">Separate them with commas.</p>

              <label>
                Author
                <input
                  type="text"
                  value={post.author}
                  onChange={(e) => touch({ author: e.target.value })}
                />
              </label>

              <label>
                Publish date
                <input
                  type="date"
                  value={post.date ? post.date.slice(0, 10) : ""}
                  onChange={(e) =>
                    touch({ date: e.target.value ? new Date(e.target.value).toISOString() : null })
                  }
                />
              </label>
              <p className="hint">
                Leave it alone unless you are backdating. Posts are listed newest
                first.
              </p>
            </div>
          </section>

          <SeoPanel post={post} onChange={touch} />

          {missing.length > 0 && (
            <p className="checklist">
              <strong>Worth adding before this goes live:</strong>{" "}
              {missing.join(", ")}. You can publish without{" "}
              {missing.length === 1 ? "it" : "them"} and come back later.
            </p>
          )}
        </aside>
      </div>

      {previewing && <Preview post={post} onClose={() => setPreviewing(false)} />}
    </div>
  );
}
