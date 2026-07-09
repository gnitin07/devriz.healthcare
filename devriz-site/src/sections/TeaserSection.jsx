import { useEffect, useRef, useState } from "react";

// Autoplaying muted teaser (with unmute) placed just before the ₹49 offer.
// Lazy: preload="none" + play only once it scrolls into view, so the 24MB
// file never downloads on initial page load.
const TeaserSection = () => {
  const vidRef = useRef(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const el = vidRef.current;
    if (!el) return;
    // React's `muted` attribute is unreliable — set the property directly so
    // muted autoplay is actually allowed by the browser
    el.muted = true;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.play?.().catch(() => {});
        } else {
          el.pause?.();
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const toggleMute = () => {
    const el = vidRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
    if (!el.muted) el.play?.().catch(() => {});
  };

  return (
    <section className="teaser-section">
      <div className="teaser-inner">
        <p className="section-eyebrow text-teal">Watch how it works</p>
        <h2 className="general-title text-teal-dark leading-none mt-3">
          See the Devriz difference
        </h2>

        <div className="teaser-frame">
          <video
            ref={vidRef}
            src="/videos/teaser.mp4"
            poster="/videos/teaser-poster.jpg"
            loop
            playsInline
            preload="none"
          />
          <button
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
        </div>
      </div>
    </section>
  );
};

export default TeaserSection;
