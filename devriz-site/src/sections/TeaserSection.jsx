import { useState } from "react";

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
// site. It now renders nothing until a YouTube ID is supplied, and when one is
// the poster comes from YouTube's CDN and the player only loads on click, so
// Vercel serves zero bytes of video either way.
const TeaserSection = () => {
  const [playing, setPlaying] = useState(false);

  if (!YOUTUBE_ID) return null;

  return (
    <section className="teaser-section">
      <div className="teaser-inner">
        <p className="section-eyebrow text-teal">Watch how it works</p>
        <h2 className="general-title text-teal-dark leading-none mt-3">
          See the Devriz difference
        </h2>

        <div className="teaser-frame">
          {playing ? (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${YOUTUBE_ID}?autoplay=1&rel=0&playsinline=1`}
              title={VIDEO_TITLE}
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
            />
          ) : (
            <button
              type="button"
              className="teaser-facade"
              onClick={() => setPlaying(true)}
              aria-label={`Play video: ${VIDEO_TITLE}`}
            >
              {/* maxresdefault is 1280x720, matching this 16:9 frame — the
                  hqdefault YouTube hands out by default is 480x360 and gets
                  cropped and upscaled. Both come from YouTube's CDN, so the
                  poster costs Vercel nothing either way; the srcset is so a
                  phone pulls 6 KB instead of 65 KB. */}
              <img
                src={`https://i.ytimg.com/vi/${YOUTUBE_ID}/maxresdefault.jpg`}
                srcSet={`https://i.ytimg.com/vi/${YOUTUBE_ID}/mqdefault.jpg 320w, https://i.ytimg.com/vi/${YOUTUBE_ID}/maxresdefault.jpg 1280w`}
                sizes="(max-width: 896px) 100vw, 896px"
                width="1280"
                height="720"
                alt=""
                aria-hidden
                loading="lazy"
              />
              <span className="teaser-play" aria-hidden>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

export default TeaserSection;
