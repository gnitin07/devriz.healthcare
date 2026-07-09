import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useContent } from "../lib/ContentContext";
import { urlFor } from "../lib/sanity";

const ICONS = [
  // target — correct identification
  <svg key="t" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" />
  </svg>,
  // sliders — personalised
  <svg key="s" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M4 8h10M18 8h2M4 16h4M12 16h8" />
    <circle cx="16" cy="8" r="2.2" />
    <circle cx="10" cy="16" r="2.2" />
  </svg>,
  // shield — avoid wrong products
  <svg key="sh" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
    <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z" />
    <path d="M9 12l2 2 4-4" strokeLinecap="round" />
  </svg>,
  // stethoscope — doctor-led
  <svg key="d" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M6 3v5a4 4 0 008 0V3" />
    <path d="M10 12v3a5 5 0 0010 0v-1" />
    <circle cx="20" cy="12" r="2" />
  </svg>,
];

// gesture frames cut from the clip (hands down → raising → presenting).
// these crossfade as the visitor scrolls the pinned scene.
const DOCTOR_FRAMES = [
  "/images/doctor-1.png",
  "/images/doctor-2.png",
  "/images/doctor-3.png",
];

const WhyConsultSection = () => {
  const { whyBanners, settings } = useContent();
  const sectionRef = useRef(null);

  const doctorSrc = settings.whyDoctorImage
    ? urlFor(settings.whyDoctorImage).width(900).auto("format").quality(82).url()
    : "/images/doctor-1.png";

  useGSAP(
    () => {
      const cards = gsap.utils.toArray(".why-card");
      if (!cards.length) return;

      // idle "breathing" on the wrapper (never conflicts with gesture tweens
      // below, which run on the inner image)
      gsap.to(".why-doctor", {
        y: 8,
        duration: 2.6,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
      });

      // pinned scene: cards arrive one by one from the doctor's side while
      // she leans in ("gestures") for each one, then settles back
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: `+=${cards.length * 70}%`,
          scrub: 1,
          pin: true,
          invalidateOnRefresh: true,
        },
      });

      tl.from(
        ".why-head-el",
        { y: 50, opacity: 0, stagger: 0.12, duration: 0.7, ease: "power3.out" },
        0
      );
      tl.from(
        ".why-doctor",
        { x: 120, opacity: 0, duration: 0.9, ease: "power3.out" },
        0.1
      );

      cards.forEach((card, i) => {
        const t = 0.9 + i;
        tl.fromTo(
          card,
          { x: 280, y: 30, opacity: 0, rotate: 5 },
          { x: 0, y: 0, opacity: 1, rotate: 0, duration: 0.75, ease: "power3.out" },
          t
        );
      });

      // doctor gesture: crossfade through her cut-out poses as the visitor
      // scrolls, so she "raises her hand to present" across the section
      const poses = gsap.utils.toArray(".why-pose");
      if (poses.length > 1) {
        const span = Math.max(cards.length, 1);
        gsap.set(poses, { opacity: 0 });
        gsap.set(poses[0], { opacity: 1 });
        // spread the pose changes across the first ~65% of the scroll so she
        // reaches the "presenting" pose early and holds it through the rest
        const lastAt = 0.6 + span * 0.62;
        for (let i = 1; i < poses.length; i++) {
          const at = 0.6 + ((i - 1) / (poses.length - 1)) * (lastAt - 0.6);
          tl.to(poses[i - 1], { opacity: 0, duration: 0.55, ease: "power1.inOut" }, at);
          tl.to(poses[i], { opacity: 1, duration: 0.55, ease: "power1.inOut" }, at);
        }
        // a whisper of zoom so she feels present, not a flat sticker
        tl.fromTo(
          ".why-doctor-fig",
          { scale: 1 },
          { scale: 1.035, ease: "none", duration: span },
          0.9
        );
      }

      // small hold at the end so the last card breathes before unpin
      tl.to({}, { duration: 0.5 });
    },
    { dependencies: [whyBanners], revertOnUpdate: true }
  );

  return (
    <section id="why" ref={sectionRef} className="why-section">
      <div className="why-stage">
        {/* clinic backdrop glow + floor shadow */}
        <div className="clinic-glow" />

        {/* the doctor — cut-out frames crossfade on scroll (she "presents"
            each card). Falls back to a single Sanity image if provided. */}
        <div className="why-doctor">
          <div className="why-doctor-fig">
            {settings.whyDoctorImage ? (
              <img
                className="why-doctor-img why-pose"
                src={doctorSrc}
                alt="Devriz senior consultant"
                loading="lazy"
                draggable={false}
              />
            ) : (
              DOCTOR_FRAMES.map((src, i) => (
                <img
                  key={src}
                  className="why-doctor-img why-pose"
                  src={src}
                  alt={i === 0 ? "Devriz senior consultant" : ""}
                  aria-hidden={i === 0 ? undefined : true}
                  draggable={false}
                />
              ))
            )}
          </div>
          <div className="doctor-shadow" />
          <div className="doctor-badge">
            <strong>Amy Aliya</strong>
            <span>Senior Cosmetologist · 15+ yrs</span>
          </div>
        </div>

        <div className="why-content">
          <div className="why-heading">
            <p className="section-eyebrow text-teal why-head-el">Why it matters</p>
            <h2 className="why-head-el">
              Why consultation before
              <br />
              treatment is important
            </h2>
            <p className="why-sub why-head-el">
              Skipping consultation leads to wrong products, wasted money and
              zero results.
            </p>
          </div>

          <div className="why-cards">
            {whyBanners.map((card, i) => (
              <div key={card._id || i} className="why-card">
                <div className="why-icon">{ICONS[i % ICONS.length]}</div>
                <div>
                  <h3>{card.title || card.text}</h3>
                  {card.description && <p>{card.description}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyConsultSection;
