import { useCallback, useEffect, useState } from "react";

import { api } from "./api";
import PostList from "./components/PostList";
import PostEditor from "./components/PostEditor";
import MediaLibrary from "./components/MediaLibrary";
import Trash from "./components/Trash";

/* ---------------------------------------------------------------------------
 * Sign in
 * ------------------------------------------------------------------------- */

function Login({ configured, dev, onSignedIn }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.login(password);
      onSignedIn();
    } catch (err) {
      setError(err.message);
      setPassword("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <form className="login-card" onSubmit={submit}>
        <h1>Devriz blog</h1>
        <p className="muted">Sign in to write and publish articles.</p>

        {dev ? (
          // `npm run dev` serves this page but not the API behind it — the
          // editor writes files, which needs the Express server.
          <p className="error">
            This is the Vite dev server, which cannot run the editor. Stop it and
            run:
            <br />
            <code>npm run build</code> then <code>npm start</code>
            <br />
            then open <code>http://localhost:8080/admin</code>.
          </p>
        ) : !configured ? (
          // The colleague cannot fix this, so the message is addressed to whoever
          // can, and says exactly which box to type in.
          <p className="error">
            This editor has no password set yet. In Hostinger hPanel, open the
            app’s <strong>Environment variables</strong>, add{" "}
            <code>ADMIN_PASSWORD</code> with a long password as its value, and
            restart the app.
          </p>
        ) : (
          <>
            <label>
              Password
              <input
                autoFocus
                type="password"
                value={password}
                autoComplete="current-password"
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {error && <p className="error">{error}</p>}
            <button className="btn-primary" type="submit" disabled={busy || !password}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
            <p className="hint">
              You stay signed in on this device for 30 days.
            </p>
          </>
        )}
      </form>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Shell
 * ------------------------------------------------------------------------- */

const NAV = [
  ["posts", "Posts"],
  ["media", "Pictures"],
  ["trash", "Trash"],
];

export default function App() {
  const [auth, setAuth] = useState({ loading: true, signedIn: false, configured: true });
  const [view, setView] = useState("posts");
  const [editing, setEditing] = useState(undefined); // undefined = not editing
  const [toast, setToast] = useState(null);

  const check = useCallback(
    () =>
      api
        .me()
        .then((d) =>
          setAuth({ loading: false, signedIn: d.signedIn, configured: d.configured, dev: d.dev })
        )
        .catch(() => setAuth({ loading: false, signedIn: false, configured: true })),
    []
  );

  useEffect(() => {
    check();
  }, [check]);

  useEffect(() => {
    if (!toast) return;
    // A publish that carried warnings has a lot more to read than "Saved".
    const t = setTimeout(() => setToast(null), Math.min(24000, 5000 + toast.length * 45));
    return () => clearTimeout(t);
  }, [toast]);

  const notify = useCallback((message) => setToast(message), []);

  if (auth.loading) return <div className="boot">Loading…</div>;
  if (!auth.signedIn) {
    return (
      <Login
        configured={auth.configured}
        dev={auth.dev}
        onSignedIn={() => setAuth({ ...auth, signedIn: true })}
      />
    );
  }

  const editorOpen = editing !== undefined;

  return (
    <div className="shell">
      <nav className="sidebar">
        <div className="brand">Devriz blog</div>

        {NAV.map(([key, label]) => (
          <button
            key={key}
            className={!editorOpen && view === key ? "is-active" : ""}
            onClick={() => {
              setEditing(undefined);
              setView(key);
            }}
          >
            {label}
          </button>
        ))}

        <div className="sidebar-foot">
          <a className="sidebar-link" href="/blogs" target="_blank" rel="noreferrer">
            View the blog ↗
          </a>
          {/* A plain link, so the browser handles the download and the session
              cookie goes with it. This is the only copy of the content that
              exists outside the server — see server/admin-api.mjs. */}
          <a className="sidebar-link" href="/api/admin/backup.zip">
            Download a backup
          </a>
          {/* Deploying uploads a freshly built dist/, which contains only the
              articles that existed when it was built. The app rebuilds the
              pages on boot, so this is normally unnecessary — it is here for
              the case where something looks stale and nobody wants to ask for a
              server restart. */}
          <button
            className="sidebar-link"
            onClick={async () => {
              try {
                const r = await api.republish();
                notify(`Rebuilt ${r.published} live page(s).`);
              } catch (e) {
                notify(e.message);
              }
            }}
          >
            Rebuild the pages
          </button>
          <button
            className="sidebar-link"
            onClick={async () => {
              await api.logout();
              setAuth({ ...auth, signedIn: false });
            }}
          >
            Sign out
          </button>
        </div>
      </nav>

      <main className="content">
        {editorOpen ? (
          <PostEditor
            slug={editing}
            onToast={notify}
            onDone={() => {
              setEditing(undefined);
              setView("posts");
            }}
          />
        ) : view === "posts" ? (
          <PostList onEdit={(slug) => setEditing(slug)} onToast={notify} />
        ) : view === "media" ? (
          <MediaLibrary onToast={notify} />
        ) : (
          <Trash onToast={notify} />
        )}
      </main>

      {toast && (
        <div className="toast" role="status">
          {toast}
          <button onClick={() => setToast(null)} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}
    </div>
  );
}
