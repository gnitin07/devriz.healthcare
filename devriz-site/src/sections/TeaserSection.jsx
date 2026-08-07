import { useEffect, useRef, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// TO RE-ENABLE THIS SECTION: paste the YouTube video ID below and redeploy.
//
//   https://www.youtube.com/watch?v=dQw4w9WgXcQ   →   "dQw4w9WgXcQ"
//   https://youtu.be/dQw4w9WgXcQ                  →   "dQw4w9WgXcQ"
//
// Leave it as "" and the whole section disappears from the page.
// ─────────────────────────────────────────────────────────────────────────────
const YOUTUBE_ID = "vOGE-ArTzHU";

// "Pigmentation Explained by Dermatologist | Causes, Treatment & Skincare Tips"
const VIDEO_TITLE = "Pigmentation explained by a dermatologist";

// Previously this section streamed /videos/teaser.mp4 (12.4 MB) straight from
// Vercel — at ~11 MB per play it was the single most expensive request on the
// site. YouTube embeds never touch that budget at all: every byte of the
// player and the video itself streams from YouTube's own CDN
// (youtube-nocookie.com / ytimg.com / googlevideo.com), never from
// devrizhealthcare.com. So autoplaying it costs Vercel nothing, no matter how
// many people watch — the thing that matters here is Vercel's "fast data
// transfer" meter, and this embed never appears in it.
//
// It still autoplays muted-only (that's the one thing every browser enforces,
// not a choice) and only once the frame scrolls into view, so a visitor who
// never reaches this section never loads the ~1 MB YouTube player either.
const TeaserSection = () => {
  const frameRef = useRef(null);
  const iframeRef = useRef(null);
  const [inView, setInView] = useState(false);
  const [ready, setReady] = useState(false);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const el = frameRef.current;
    if (!el || !YOUTUBE_ID) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const toggleMute = () => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    const next = !muted;
    win.postMessage(
      JSON.stringify({ event: "command", func: next ? "mute" : "unMute", args: [] }),
      "*"
    );
    setMuted(next);
  };

  if (!YOUTUBE_ID) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const src =
    `https://www.youtube-nocookie.com/embed/${YOUTUBE_ID}` +
    `?autoplay=1&mute=1&rel=0&playsinline=1&modestbranding=1&enablejsapi=1&origin=${encodeURIComponent(origin)}`;

  return (
    <section className="teaser-section">
      <div className="teaser-inner">
        <p className="section-eyebrow text-teal">Watch how it works</p>
        <h2 className="general-title text-teal-dark leading-none mt-3">
          See the Devriz Healthcare difference
        </h2>

        <div className="teaser-frame" ref={frameRef}>
          {/* poster sits underneath and stays visible until the iframe
              reports loaded, so there's never a flash of empty black */}
          <img
            className="teaser-poster"
            src={`https://i.ytimg.com/vi/${YOUTUBE_ID}/maxresdefault.jpg`}
            srcSet={`https://i.ytimg.com/vi/${YOUTUBE_ID}/mqdefault.jpg 320w, https://i.ytimg.com/vi/${YOUTUBE_ID}/maxresdefault.jpg 1280w`}
            sizes="(max-width: 896px) 100vw, 896px"
            width="1280"
            height="720"
            alt=""
            aria-hidden
            loading="lazy"
          />

          {inView && (
            <iframe
              ref={iframeRef}
              className={ready ? "is-ready" : ""}
              src={src}
              title={VIDEO_TITLE}
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              onLoad={() => setReady(true)}
            />
          )}

          {inView && (
            <button
              type="button"
              className="teaser-mute"
              onClick={toggleMute}
              aria-label={muted ? "Unmute video" : "Mute video"}
            >
              {muted ? (
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M11 5 6 9H3v6h3l5 4V5zM16.5 12l2.5-2.5-1.4-1.4L15 10.6l-2.6-2.5L11 9.5l2.6 2.5L11 14.6 12.4 16l2.6-2.5 2.6 2.5 1.4-1.4z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M11 5 6 9H3v6h3l5 4V5zM15.5 8.5a5 5 0 0 1 0 7l1.4 1.4a7 7 0 0 0 0-9.8zM18 6a9 9 0 0 1 0 12l1.4 1.4a11 11 0 0 0 0-14.8z" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

export default TeaserSection;
