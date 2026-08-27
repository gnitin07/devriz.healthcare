import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { optimize } from "../lib/optimize";

const kb = (n) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`);

export default function MediaLibrary({ onToast }) {
  const [images, setImages] = useState(null);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(null);
  const input = useRef(null);

  const load = () =>
    api
      .media()
      .then((d) => setImages(d.images))
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  const upload = async (files) => {
    setError(null);
    for (const file of files) {
      try {
        const payload = await optimize(file, { onProgress: setUploading });
        setUploading(`Uploading ${file.name}…`);
        await api.upload(payload);
      } catch (e) {
        setError(e.message);
      }
    }
    setUploading(null);
    load();
  };

  const remove = async (image) => {
    if (!confirm(`Delete ${image.name}?`)) return;
    try {
      await api.deleteMedia(image.name);
      onToast(`${image.name} deleted.`);
      load();
    } catch (e) {
      // The server refuses when a post still points at it, which is the useful
      // case — the message names the reason.
      setError(e.message);
    }
  };

  return (
    <div className="pane">
      <header className="pane-head">
        <div>
          <h1>Pictures</h1>
          <p className="muted">
            Every photo used in an article. Each one is compressed and resized
            automatically when it is uploaded.
          </p>
        </div>
        <button className="btn-primary" onClick={() => input.current?.click()}>
          + Upload
        </button>
        <input
          ref={input}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            upload([...e.target.files]);
            e.target.value = "";
          }}
        />
      </header>

      {error && <p className="error">{error}</p>}
      {uploading && <p className="muted">{uploading}</p>}

      {images === null ? (
        <p className="muted">Loading…</p>
      ) : images.length === 0 ? (
        <div className="empty">
          <p>No pictures yet.</p>
        </div>
      ) : (
        <div className="media-grid">
          {images.map((img) => (
            <figure key={img.name} className="media-item">
              <img src={img.url} alt="" loading="lazy" />
              <figcaption>
                <span className="media-name" title={img.name}>
                  {img.name}
                </span>
                <span className="muted">
                  {img.width ? `${img.width}×${img.height} · ` : ""}
                  {kb(img.size)}
                </span>
                <div className="row">
                  <button
                    className="btn-quiet"
                    onClick={() => {
                      navigator.clipboard?.writeText(img.url);
                      onToast("Address copied.");
                    }}
                  >
                    Copy address
                  </button>
                  <button className="btn-quiet danger" onClick={() => remove(img)}>
                    Delete
                  </button>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
