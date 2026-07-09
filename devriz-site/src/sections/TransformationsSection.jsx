import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
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
  const trackRef = useRef(null);
  const sectionRef = useRef(null);
  const videoRefs = useRef([]);

  useGSAP(
    () => {
      const track = trackRef.current;
      if (!track) return;

      const distance = () => track.scrollWidth - window.innerWidth * 0.5;

      // cula.tech-style: pinned viewport, content glides horizontally with
      // a soft catch-up (scrub 1.5) while the heading drifts slower for depth
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: () => `+=${distance()}`,
          scrub: 1.5,
          pin: true,
          invalidateOnRefresh: true,
          onEnter: () => videoRefs.current.forEach((v) => v?.play?.().catch(() => {})),
          onLeave: () => videoRefs.current.forEach((v) => v?.pause?.()),
          onEnterBack: () => videoRefs.current.forEach((v) => v?.play?.().catch(() => {})),
          onLeaveBack: () => videoRefs.current.forEach((v) => v?.pause?.()),
        },
      });

      tl.to(track, { x: () => -distance(), ease: "none" }, 0)
        .to(".transform-header h2", { xPercent: -14, ease: "none" }, 0)
        .to(".transform-progress .bar", { scaleX: 1, ease: "none" }, 0);

      // slight per-card lift as they travel (depth, not gimmick)
      gsap.utils.toArray(".transform-card").forEach((card, i) => {
        gsap.from(card, {
          y: 40 + (i % 2) * 30,
          ease: "none",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top top",
            end: () => `+=${distance()}`,
            scrub: 2,
          },
        });
      });
    },
    { dependencies: [transformations], revertOnUpdate: true }
  );

  return (
    <section ref={sectionRef} className="transform-section">
      <div className="transform-viewport">
        <div className="transform-header">
          <p className="section-eyebrow text-amber">
            Real people · real results
          </p>
          <h2>Transformation journeys</h2>
        </div>

        <div ref={trackRef} className="transform-track">
          {transformations.map((t, i) => (
            <div key={t._id || i} className="transform-card">
              <div className="card-media">
                {t.resultImage ? (
                  <div className="ba-full">
                    <img src={t.resultImage} alt={t.concern || t.name} loading="lazy" />
                    <span className="ba-full-label">Before · After</span>
                    {t.duration && (
                      <span className="ba-duration">
                        ✨ Results in {t.duration}
                      </span>
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

        <div className="transform-progress">
          <div className="bar" />
        </div>
      </div>
    </section>
  );
};

export default TransformationsSection;
