import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Node, mergeAttributes } from "@tiptap/core";
import { marked } from "marked";

import { optimize } from "../lib/optimize";
import { api } from "../api";

/* ---------------------------------------------------------------------------
 * A button, as a block the writer can drop anywhere in an article.
 *
 * It renders as the same <a class="blog-btn"> the live site styles, so what is
 * in the editor is exactly what is published — no shortcode, no placeholder,
 * nothing to translate on the way out.
 * ------------------------------------------------------------------------- */
const CtaButton = Node.create({
  name: "ctaButton",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes: () => ({
    href: { default: "/consult" },
    label: { default: "Book a consultation" },
    newTab: { default: false },
  }),

  parseHTML: () => [
    {
      tag: "a[data-btn]",
      getAttrs: (el) => ({
        href: el.getAttribute("href") || "#",
        label: el.textContent || "Button",
        newTab: el.getAttribute("target") === "_blank",
      }),
    },
  ],

  renderHTML: ({ HTMLAttributes, node }) =>
    [
      "a",
      mergeAttributes(
        {
          "data-btn": "",
          class: "blog-btn",
          href: node.attrs.href,
        },
        node.attrs.newTab ? { target: "_blank", rel: "noopener noreferrer" } : {},
        // label is our own bookkeeping; it becomes the link text below, and
        // must not also be written out as an attribute.
        Object.fromEntries(
          Object.entries(HTMLAttributes).filter(([k]) => !["label", "newTab", "href"].includes(k))
        )
      ),
      node.attrs.label || "Button",
    ],
});

/* ---------------------------------------------------------------------------
 * Pictures, with a size and an alignment the writer controls.
 *
 * Stored as data- attributes rather than inline styles so the site's own
 * stylesheet decides what "small" means at each screen width — an inline pixel
 * width chosen on a laptop would overflow a phone. blog-images.js preserves
 * unknown attributes when it rewrites <img> tags for the srcset, so these
 * survive to the published page.
 * ------------------------------------------------------------------------- */
export const IMAGE_SIZES = [
  ["small", "Small"],
  ["medium", "Medium"],
  ["full", "Full width"],
];
export const IMAGE_ALIGNMENTS = [
  ["left", "Left"],
  ["center", "Centre"],
  ["right", "Right"],
];

const dataAttr = (name, fallback) => ({
  default: fallback,
  parseHTML: (el) => el.getAttribute(`data-${name}`) || fallback,
  renderHTML: (attrs) => ({ [`data-${name}`]: attrs[name] || fallback }),
});

const Picture = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      size: dataAttr("size", "full"),
      align: dataAttr("align", "center"),
    };
  },
});

/* ---------------------------------------------------------------------------
 * Pasting
 * ------------------------------------------------------------------------- */

/**
 * ChatGPT puts BOTH rich HTML and a plain-text markdown copy on the clipboard.
 * ProseMirror prefers the HTML, which is what we want — headings arrive as
 * headings, bold as bold. This handler is for the other case: pasting from a
 * plain-text box, a code editor, or a phone, where only the markdown arrives.
 *
 * The old editor got this wrong in a way that reached the live site — the one
 * published article contains "\## What pigmentation actually is" and "\*Sun
 * tan.\*", markdown that was escaped into literal text instead of being read.
 * Converting it here is what stops that happening again.
 */
const looksLikeMarkdown = (text) =>
  /^#{1,6}\s/m.test(text) ||
  /^\s*[-*+]\s+\S/m.test(text) ||
  /^\s*\d+\.\s+\S/m.test(text) ||
  /\*\*[^*\n]+\*\*/.test(text) ||
  /^>\s+\S/m.test(text) ||
  /\[[^\]]+\]\([^)]+\)/.test(text);

/* ---------------------------------------------------------------------------
 * Editor
 * ------------------------------------------------------------------------- */

const HEADINGS = [
  { level: 0, label: "Normal text" },
  { level: 2, label: "Heading 2 — main section" },
  { level: 3, label: "Heading 3 — sub-section" },
  { level: 4, label: "Heading 4 — small point" },
  { level: 1, label: "Heading 1 — see note" },
];

const Btn = ({ active, disabled, title, onClick, children }) => (
  <button
    type="button"
    className={`tb-btn${active ? " is-active" : ""}`}
    title={title}
    aria-label={title}
    aria-pressed={active || undefined}
    disabled={disabled}
    // Keeps focus in the document, so the command applies to the current
    // selection instead of to nothing.
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
  >
    {children}
  </button>
);

export default function RichEditor({ value, onChange, onDirty, onSelectImage, onEditor }) {
  const [linkDialog, setLinkDialog] = useState(null);
  const [buttonDialog, setButtonDialog] = useState(null);
  const [uploading, setUploading] = useState(null);
  const fileInput = useRef(null);

  /**
   * Which picture is selected is reported UP to PostEditor, which owns the
   * side panel. The controls used to sit under the article, where they were
   * easy to miss entirely — the panel is where every other property of the
   * post already lives, so that is where a picture's properties belong too.
   */
  const report = (e) => {
    const node = e.state.selection.node;
    onSelectImage?.(node?.type?.name === "image" ? node.attrs : null);
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: "https",
          // target defaults to _blank in TipTap. Left alone, every link a
          // writer pastes — including links to our own other articles, which
          // exist to keep the reader moving through the site — would open a new
          // tab. The "Open in a new tab" checkbox sets it deliberately instead.
          HTMLAttributes: { target: null, rel: "noopener noreferrer" },
        },
        // Nobody writing about skin care needs a code block, and the button is
        // one more thing to explain.
        codeBlock: false,
      }),
      Picture.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({
        placeholder: "Write the article here — or paste it straight from ChatGPT.",
      }),
      CtaButton,
    ],
    content: value || "",
    editorProps: {
      attributes: {
        // The real article classes. This is what makes the editor show the
        // published fonts, sizes and spacing rather than an approximation.
        class: "blog-body editor-surface",
        spellcheck: "true",
      },
      handlePaste(view, event) {
        const text = event.clipboardData?.getData("text/plain");
        const html = event.clipboardData?.getData("text/html");
        // Rich HTML on the clipboard is already better than anything we could
        // reconstruct — let ProseMirror have it.
        if (html || !text || !looksLikeMarkdown(text)) return false;
        event.preventDefault();
        editorRef.current
          ?.chain()
          .focus()
          .insertContent(marked.parse(text, { gfm: true, breaks: false }))
          .run();
        return true;
      },
    },
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML());
      onDirty?.();
    },
    onSelectionUpdate: ({ editor: e }) => report(e),
    // A click straight onto a picture changes the selection without always
    // firing onSelectionUpdate, so the panel would not open on the very
    // interaction most likely to be the writer asking for it.
    onTransaction: ({ editor: e }) => report(e),
  });

  // handlePaste is captured when the editor is created, before `editor` exists.
  const editorRef = useRef(null);
  editorRef.current = editor;

  // PostEditor owns the picture side panel, so it needs the instance to act on.
  useEffect(() => {
    onEditor?.(editor);
  }, [editor, onEditor]);

  // The editor owns its content once mounted; this only syncs an outside
  // change, such as loading a different post into the same editor instance.
  useEffect(() => {
    if (!editor) return;
    const next = value || "";
    if (next !== editor.getHTML()) editor.commands.setContent(next, { emitUpdate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, value]);

  /* ---- images ---- */

  const insertImage = useCallback(
    async (file) => {
      if (!file || !editor) return;
      try {
        const payload = await optimize(file, { onProgress: setUploading });
        setUploading("Uploading…");
        const saved = await api.upload(payload);
        const attrs = { src: saved.url, alt: "", size: "full", align: "center" };
        editor.chain().focus().setImage(attrs).createParagraphNear().run();
        // Opens the side panel on the picture just inserted, so the writer is
        // already looking at the description box while they still remember what
        // the photo shows.
        onSelectImage?.(attrs);
      } catch (err) {
        alert(err.message);
      } finally {
        setUploading(null);
      }
    },
    [editor, onSelectImage]
  );

  /* ---- links ---- */

  const openLinkDialog = () => {
    if (!editor) return;
    const existing = editor.getAttributes("link");
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, " ");
    if (!text && !existing.href) {
      alert("Select the words you want to turn into a link first.");
      return;
    }
    setLinkDialog({
      href: existing.href || "",
      newTab: existing.target === "_blank",
      text,
    });
  };

  const applyLink = ({ href, newTab }) => {
    if (!href) {
      editor.chain().focus().unsetLink().run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({
          href,
          target: newTab ? "_blank" : null,
          rel: newTab ? "noopener noreferrer" : null,
        })
        .run();
    }
    setLinkDialog(null);
  };

  /* ---- buttons ---- */

  const openButtonDialog = () => {
    if (!editor) return;
    const isButton = editor.isActive("ctaButton");
    setButtonDialog(
      isButton
        ? { ...editor.getAttributes("ctaButton"), editing: true }
        : { href: "/consult", label: "Book a consultation @ ₹49", newTab: false }
    );
  };

  const applyButton = (attrs) => {
    if (attrs.editing) {
      editor.chain().focus().updateAttributes("ctaButton", attrs).run();
    } else {
      editor.chain().focus().insertContent({ type: "ctaButton", attrs }).run();
    }
    setButtonDialog(null);
  };

  if (!editor) return <div className="editor-loading">Loading the editor…</div>;

  const headingValue = HEADINGS.find((h) => h.level && editor.isActive("heading", { level: h.level }))
    ?.level ?? 0;

  return (
    <div className="editor">
      <div className="editor-toolbar" role="toolbar" aria-label="Formatting">
        <select
          className="tb-select"
          value={headingValue}
          onChange={(e) => {
            const level = Number(e.target.value);
            const chain = editor.chain().focus();
            if (level === 0) chain.setParagraph().run();
            else chain.setHeading({ level }).run();
          }}
          title="Text style"
        >
          {HEADINGS.map((h) => (
            <option key={h.level} value={h.level}>
              {h.label}
            </option>
          ))}
        </select>

        <span className="tb-sep" />

        <Btn
          title="Bold (Ctrl+B)"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <b>B</b>
        </Btn>
        <Btn
          title="Italic (Ctrl+I)"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <i>I</i>
        </Btn>
        <Btn
          title="Underline (Ctrl+U)"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <u>U</u>
        </Btn>

        <span className="tb-sep" />

        <Btn
          title="Bulleted list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          ••
        </Btn>
        <Btn
          title="Numbered list"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1.
        </Btn>
        <Btn
          title="Quote"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          ❝
        </Btn>

        <span className="tb-sep" />

        <Btn title="Add or edit a link" active={editor.isActive("link")} onClick={openLinkDialog}>
          🔗
        </Btn>
        <Btn
          title="Remove the link"
          disabled={!editor.isActive("link")}
          onClick={() => editor.chain().focus().unsetLink().run()}
        >
          ⛓️‍💥
        </Btn>
        <Btn title="Insert a picture here" onClick={() => fileInput.current?.click()}>
          🖼
        </Btn>
        <Btn
          title="Insert a button"
          active={editor.isActive("ctaButton")}
          onClick={openButtonDialog}
        >
          ▭
        </Btn>
        <Btn
          title="Divider line"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          —
        </Btn>

        <span className="tb-sep" />

        <Btn
          title="Remove formatting from the selected text"
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
        >
          ⌫ᶠ
        </Btn>
        <Btn
          title="Undo (Ctrl+Z)"
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          ↶
        </Btn>
        <Btn
          title="Redo (Ctrl+Y)"
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          ↷
        </Btn>

        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            insertImage(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>

      {editor.isActive("heading", { level: 1 }) && (
        <p className="editor-note">
          The post title is already this page’s main heading. A second Heading 1
          inside the article confuses Google about what the page is about — use
          Heading 2 for a section.
        </p>
      )}

      {/* .blog-body's rules are nested inside .blog-section .blog-article in
          index.css, so the editor has to sit in the same two wrappers or it
          inherits none of them. admin.css strips the section's page padding
          back off. This is what makes typing here look like reading there. */}
      <div className="blog-section editor-canvas">
        <div className="blog-article">
          <EditorContent editor={editor} />
        </div>
      </div>

      {uploading && <div className="editor-uploading">{uploading}</div>}

      {/* A picture's properties are edited in the right-hand panel, not here —
          PostEditor renders them from the selection reported by report(). */}

      {linkDialog && (
        <Dialog title="Link" onClose={() => setLinkDialog(null)}>
          <LinkForm initial={linkDialog} onApply={applyLink} onCancel={() => setLinkDialog(null)} />
        </Dialog>
      )}

      {buttonDialog && (
        <Dialog
          title={buttonDialog.editing ? "Edit button" : "Add a button"}
          onClose={() => setButtonDialog(null)}
        >
          <ButtonForm
            initial={buttonDialog}
            onApply={applyButton}
            onCancel={() => setButtonDialog(null)}
            onDelete={
              buttonDialog.editing
                ? () => {
                    editor.chain().focus().deleteSelection().run();
                    setButtonDialog(null);
                  }
                : null
            }
          />
        </Dialog>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Small dialogs
 * ------------------------------------------------------------------------- */

function Dialog({ title, children, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="dialog-backdrop" onMouseDown={onClose}>
      <div className="dialog" role="dialog" aria-label={title} onMouseDown={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  );
}

function LinkForm({ initial, onApply, onCancel }) {
  const [href, setHref] = useState(initial.href);
  const [newTab, setNewTab] = useState(initial.newTab);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onApply({ href: href.trim(), newTab });
      }}
    >
      {initial.text && (
        <p className="hint">
          Linking: <strong>{initial.text}</strong>
        </p>
      )}
      <label>
        Web address
        <input
          autoFocus
          type="text"
          value={href}
          placeholder="https://example.com  or  /consult"
          onChange={(e) => setHref(e.target.value)}
        />
      </label>
      <p className="hint">
        A link to another page on this site starts with a slash, e.g.{" "}
        <code>/blogs/acne-guide</code>. Anything elsewhere needs the full{" "}
        <code>https://…</code>.
      </p>
      <label className="check">
        <input type="checkbox" checked={newTab} onChange={(e) => setNewTab(e.target.checked)} />
        Open in a new tab
      </label>
      <div className="dialog-actions">
        {initial.href && (
          <button type="button" className="btn-quiet" onClick={() => onApply({ href: "" })}>
            Remove link
          </button>
        )}
        <button type="button" className="btn-quiet" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn-primary">
          Apply
        </button>
      </div>
    </form>
  );
}

function ButtonForm({ initial, onApply, onCancel, onDelete }) {
  const [label, setLabel] = useState(initial.label || "");
  const [href, setHref] = useState(initial.href || "");
  const [newTab, setNewTab] = useState(Boolean(initial.newTab));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onApply({
          label: label.trim() || "Button",
          href: href.trim() || "#",
          newTab,
          editing: initial.editing,
        });
      }}
    >
      <label>
        Button text
        <input autoFocus type="text" value={label} onChange={(e) => setLabel(e.target.value)} />
      </label>
      <label>
        Goes to
        <input
          type="text"
          value={href}
          placeholder="/consult"
          onChange={(e) => setHref(e.target.value)}
        />
      </label>
      <p className="hint">
        <code>/consult</code> is the ₹49 consultation page — the usual one.
      </p>
      <label className="check">
        <input type="checkbox" checked={newTab} onChange={(e) => setNewTab(e.target.checked)} />
        Open in a new tab
      </label>
      <div className="dialog-actions">
        {onDelete && (
          <button type="button" className="btn-quiet" onClick={onDelete}>
            Delete button
          </button>
        )}
        <button type="button" className="btn-quiet" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn-primary">
          {initial.editing ? "Save" : "Insert"}
        </button>
      </div>
    </form>
  );
}
