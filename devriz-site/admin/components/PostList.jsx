import { useEffect, useState } from "react";
import { api } from "../api";

const fmt = (iso) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
};

/**
 * Posts written in the old editor had their pasted markdown escaped, so they
 * render with no headings and with every wrapped line as its own paragraph.
 * This offers the fix in the panel, because SSH is switched off on this host
 * and enabling it to run a one-line script is a worse answer than a button.
 *
 * Shows nothing at all once there is nothing left to repair, which is the
 * normal state — it is a one-time notice, not a permanent fixture.
 */
function RepairNotice({ onToast, onDone }) {
  const [pending, setPending] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .repairPreview()
      .then((d) => setPending(d.posts))
      .catch(() => setPending([]));
  }, []);

  if (!pending.length) return null;

  const gained = pending.reduce((n, p) => n + (p.after.headings - p.before.headings), 0);

  const run = async () => {
    setBusy(true);
    try {
      const { repaired } = await api.repair();
      onToast(`Repaired ${repaired.length} article(s). The website is updated.`);
      setPending([]);
      onDone();
    } catch (e) {
      onToast(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="notice">
      <div>
        <strong>
          {pending.length} article{pending.length === 1 ? "" : "s"} from the old editor
          {" "}
          {pending.length === 1 ? "needs" : "need"} a one-time fix.
        </strong>
        <p>
          The old editor turned pasted headings into plain text and split
          sentences across several paragraphs. Fixing{" "}
          {pending.length === 1 ? "it" : "them"} restores {gained} heading
          {gained === 1 ? "" : "s"} and rejoins the paragraphs. Nothing else in
          the {pending.length === 1 ? "article" : "articles"} changes.
        </p>
        <ul>
          {pending.map((p) => (
            <li key={p.slug}>
              {p.title} — headings {p.before.headings} → {p.after.headings}, paragraphs{" "}
              {p.before.paragraphs} → {p.after.paragraphs}
            </li>
          ))}
        </ul>
      </div>
      <button className="btn-primary" disabled={busy} onClick={run}>
        {busy ? "Fixing…" : "Fix them"}
      </button>
    </div>
  );
}

export default function PostList({ onEdit, onToast }) {
  const [state, setState] = useState({ loading: true, posts: [], trash: 0 });
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  const load = () =>
    api
      .posts()
      .then((d) => setState({ loading: false, posts: d.posts, trash: d.trash }))
      .catch((e) => {
        setError(e.message);
        setState((s) => ({ ...s, loading: false }));
      });

  useEffect(() => {
    load();
  }, []);

  const remove = async (post) => {
    if (
      !confirm(
        `Delete "${post.title}"?\n\nIt comes off the website straight away, but it goes to Trash — you can put it back.`
      )
    ) {
      return;
    }
    try {
      await api.deletePost(post.slug);
      onToast(`"${post.title}" deleted. It is in Trash if you need it back.`);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const shown = state.posts
    .filter((p) => (filter === "all" ? true : filter === "live" ? !p.draft : p.draft))
    .filter((p) =>
      query.trim() ? p.title.toLowerCase().includes(query.trim().toLowerCase()) : true
    );

  const live = state.posts.filter((p) => !p.draft).length;
  const drafts = state.posts.length - live;

  return (
    <div className="pane">
      <header className="pane-head">
        <div>
          <h1>Blog posts</h1>
          <p className="muted">
            {live} live · {drafts} draft{drafts === 1 ? "" : "s"}
            {state.trash > 0 && ` · ${state.trash} in trash`}
          </p>
        </div>
        <button className="btn-primary" onClick={() => onEdit(null)}>
          + New post
        </button>
      </header>

      {error && <p className="error">{error}</p>}

      <RepairNotice onToast={onToast} onDone={load} />

      <div className="list-controls">
        <div className="tabs">
          {[
            ["all", `All (${state.posts.length})`],
            ["live", `Live (${live})`],
            ["draft", `Drafts (${drafts})`],
          ].map(([key, label]) => (
            <button
              key={key}
              className={filter === key ? "is-active" : ""}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          type="search"
          placeholder="Search titles…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {state.loading ? (
        <p className="muted">Loading…</p>
      ) : shown.length === 0 ? (
        <div className="empty">
          {state.posts.length === 0 ? (
            <>
              <p>No posts yet.</p>
              <button className="btn-primary" onClick={() => onEdit(null)}>
                Write the first one
              </button>
            </>
          ) : (
            <p>Nothing matches that.</p>
          )}
        </div>
      ) : (
        <table className="post-table">
          <tbody>
            {shown.map((p) => (
              <tr key={p.slug}>
                <td className="col-thumb">
                  {p.image ? (
                    <img src={p.image} alt="" />
                  ) : (
                    <div className="thumb-ph" aria-hidden="true" />
                  )}
                </td>
                <td className="col-title">
                  <button className="link-title" onClick={() => onEdit(p.slug)}>
                    {p.title}
                  </button>
                  <div className="col-sub">
                    /blogs/{p.slug} · {p.readingTime} min read
                  </div>
                </td>
                <td className="col-status">
                  <span className={`pill ${p.draft ? "pill-draft" : "pill-live"}`}>
                    {p.draft ? "Draft" : "Live"}
                  </span>
                </td>
                <td className="col-date">{fmt(p.date)}</td>
                <td className="col-actions">
                  <button className="btn-quiet" onClick={() => onEdit(p.slug)}>
                    Edit
                  </button>
                  {!p.draft && (
                    <a
                      className="btn-quiet"
                      href={`/blogs/${p.slug}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View
                    </a>
                  )}
                  <button className="btn-quiet danger" onClick={() => remove(p)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
