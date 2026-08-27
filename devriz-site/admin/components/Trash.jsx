import { useEffect, useState } from "react";
import { api } from "../api";

/**
 * Deleting is the one action here with no undo anywhere else — there is no
 * version control behind this content, which was the trade for being able to
 * publish without a pull request. So a delete is a move, and this is where it
 * moves to.
 */
export default function Trash({ onToast }) {
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState(null);

  const load = () =>
    api
      .trash()
      .then((d) => setPosts(d.posts))
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  const restore = async (post) => {
    try {
      await api.restore(post.slug);
      onToast(`"${post.title}" restored as a draft. Open it and publish when ready.`);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const purge = async (post) => {
    if (
      !confirm(
        `Permanently delete "${post.title}"?\n\nThis one cannot be undone — there is no other copy.`
      )
    ) {
      return;
    }
    try {
      await api.purge(post.slug);
      onToast(`"${post.title}" deleted permanently.`);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="pane">
      <header className="pane-head">
        <div>
          <h1>Trash</h1>
          <p className="muted">
            Deleted posts are kept here. Restoring one brings it back as a draft,
            so nothing reappears on the website by surprise.
          </p>
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      {posts === null ? (
        <p className="muted">Loading…</p>
      ) : posts.length === 0 ? (
        <div className="empty">
          <p>Trash is empty.</p>
        </div>
      ) : (
        <table className="post-table">
          <tbody>
            {posts.map((p) => (
              <tr key={p.slug}>
                <td className="col-title">
                  <strong>{p.title}</strong>
                  <div className="col-sub">was /blogs/{p.slug}</div>
                </td>
                <td className="col-actions">
                  <button className="btn-quiet" onClick={() => restore(p)}>
                    Restore
                  </button>
                  <button className="btn-quiet danger" onClick={() => purge(p)}>
                    Delete for ever
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
