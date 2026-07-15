import { useEffect, useRef, useState } from "react";
import { useContent } from "../lib/ContentContext";
import { urlFor } from "../lib/sanity";

const Stars = ({ n = 5 }) => (
  <span className="stars">{"★".repeat(n) + "☆".repeat(5 - n)}</span>
);

const BAImage = ({ img, label, left }) => (
  <>
    {img ? (
      <img
        src={urlFor(img).width(500).auto("format").quality(75).url()}
        alt={label}
        loading="lazy"
      />
    ) : (
      <div className={`ba-ph ${left ? "bg-[#e9d4c3]" : "bg-[#d7ebe3]"}`} />
    )}
    <span className={`ba-label ${left ? "left-3" : "right-3"}`}>{label}</span>
  </>
);

const TransformationsSection = () => {
  const { transformations } = useContent();
  const sectionRef = useRef(null);
  const videoRefs = useRef([]);
  const [inView, setInView] = useState(false);

  // no pin / no scroll-scrub — the strip is a native horizontal scroller. The
  // entrance is a pure CSS reveal (hidden state set in CSS, so it never flashes
  // already-painted content = no scroll jitter); the observer just flips a class.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className={`transform-section ${inView ? "is-in" : ""}`}
    >
      <div className="transform-header">
        <p className="section-eyebrow text-amber">Real people · real results</p>
        <h2>Transformation journeys</h2>
      </div>

      <div className="transform-track">
        {transformations.map((t, i) => (
          <div key={t._id || i} className="transform-card">
            <div className="card-media">
              {t.resultImage ? (
                <div className="ba-full">
                  <img src={t.resultImage} alt={t.concern || t.name} loading="lazy" />
                  <span className="ba-full-label">Before · After</span>
                  {t.duration && (
                    <span className="ba-duration">✨ Results in {t.duration}</span>
                  )}
                </div>
              ) : t.videoUrl ? (
                <video
                  ref={(el) => (videoRefs.current[i] = el)}
                  src={t.videoUrl}
                  muted
                  loop
                  playsInline
                  preload="metadata"
                />
              ) : (
                <div className="ba-grid">
                  <div className="relative">
                    <BAImage img={t.before} label="Before" left />
                  </div>
                  <div className="relative">
                    <BAImage img={t.after} label="After" />
                  </div>
                </div>
              )}
            </div>
            <div className="transform-body">
              <div className="review-top">
                <Stars n={t.rating || 5} />
                <span className="verified">✓ Verified consultation</span>
              </div>
              <p>“{t.review}”</p>
              <div className="who">
                <h4>{t.name}</h4>
                {t.concern && <span className="concern-tag">{t.concern}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default TransformationsSection;
