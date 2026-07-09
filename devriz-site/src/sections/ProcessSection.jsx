import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useContent } from "../lib/ContentContext";

const ACCENTS = ["#e8a33d", "#2e8f86", "#c96f4a"];

const ProcessSection = () => {
  const { steps } = useContent();

  useGSAP(
    () => {
      // cards drive in from outside the right edge of the screen
      const offRight = (card) =>
        window.innerWidth - card.getBoundingClientRect().left + 100;

      const mm = gsap.matchMedia();

      // desktop: one row — staggered, card 1 leads, 2 and 3 chase it
      mm.add("(min-width: 768px)", () => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: ".process-section",
            start: "top 70%",
            end: "top 5%",
            scrub: 1,
            invalidateOnRefresh: true,
          },
        });
        gsap.utils.toArray(".process-card").forEach((card, i) => {
          tl.from(
            card,
            {
              x: () => offRight(card),
              rotate: 4,
              duration: 1,
              ease: "power2.out",
            },
            i * 0.3
          );
        });
      });

      // mobile: cards are stacked — each slides in as it reaches the viewport
      mm.add("(max-width: 767px)", () => {
        gsap.utils.toArray(".process-card").forEach((card) => {
          gsap.from(card, {
            x: () => offRight(card),
            rotate: 3,
            ease: "power2.out",
            scrollTrigger: {
              trigger: card,
              start: "top 92%",
              end: "top 55%",
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
              <div key={step._id || i} className="process-card">
                <span className="step-num" style={{ color: accent }}>
                  Step 0{i + 1}
                </span>
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
