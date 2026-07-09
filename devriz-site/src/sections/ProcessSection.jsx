import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useContent } from "../lib/ContentContext";

const ACCENTS = ["#e8a33d", "#2e8f86", "#c96f4a"];

const ICONS = [
  // 1 — consult (chat bubble)
  <svg key="c" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 4H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h4v3l4-3h8a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1z" />
    <path d="M8 10h0M12 10h0M16 10h0" />
  </svg>,
  // 2 — personalised products (serum bottle)
  <svg key="b" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 3h6" />
    <path d="M10 3v2.5M14 3v2.5" />
    <path d="M8.5 5.5h7V19a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2V5.5z" />
    <path d="M8.5 11h7" />
  </svg>,
  // 3 — dispatched (package box)
  <svg key="p" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" />
    <path d="M3 8l9 5 9-5" />
    <path d="M12 13v8" />
  </svg>,
];

const ProcessSection = () => {
  const { steps } = useContent();

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      // desktop: the row glides in from the left across the screen, staggered,
      // scrubbed to scroll. offset is based on viewport width (stable) — never
      // on the card's own live position, so it can't feed back / reverse.
      mm.add("(min-width: 768px)", () => {
        gsap.from(".process-card", {
          x: () => -window.innerWidth * 0.85,
          opacity: 0,
          stagger: 0.2,
          ease: "none",
          scrollTrigger: {
            trigger: ".process-section",
            start: "top 78%",
            end: "top 22%",
            scrub: 1,
            invalidateOnRefresh: true,
          },
        });
      });

      // mobile: each stacked card glides in from the left as it scrolls in
      mm.add("(max-width: 767px)", () => {
        gsap.utils.toArray(".process-card").forEach((card) => {
          gsap.from(card, {
            x: () => -window.innerWidth * 0.7,
            opacity: 0,
            ease: "none",
            scrollTrigger: {
              trigger: card,
              start: "top 90%",
              end: "top 48%",
              scrub: 1,
              invalidateOnRefresh: true,
            },
          });
        });
      });

      gsap.from(".process-heading", {
        yPercent: 60,
        opacity: 0,
        ease: "power2.out",
        scrollTrigger: {
          trigger: ".process-section",
          start: "top 80%",
          end: "top 45%",
          scrub: 1,
        },
      });
    },
    { dependencies: [steps], revertOnUpdate: true }
  );

  return (
    <section id="process" className="process-section">
      <div className="mx-auto max-w-7xl md:px-8 px-5">
        <div className="process-heading text-center md:mb-20 mb-12">
          <p className="section-eyebrow text-teal">Simple by design</p>
          <h2 className="general-title text-teal-dark leading-none mt-4">
            The Devriz
            <br />3 step process
          </h2>
        </div>

        <div className="grid md:grid-cols-3 grid-cols-1 md:gap-8 gap-6">
          {steps.map((step, i) => {
            const accent = step.accent || ACCENTS[i % ACCENTS.length];
            return (
              <div
                key={step._id || i}
                className="process-card"
                style={{ "--accent": accent }}
              >
                <div className="pc-top">
                  <div className="pc-icon">{ICONS[i % ICONS.length]}</div>
                  <span className="pc-num" aria-hidden>
                    0{i + 1}
                  </span>
                </div>
                <span className="pc-tag">Step 0{i + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ProcessSection;
