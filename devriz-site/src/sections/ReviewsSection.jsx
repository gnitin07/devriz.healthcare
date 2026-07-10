import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/all";

gsap.registerPlugin(ScrollTrigger);

// Real WhatsApp reviews (screenshots in /public/images/reviews). The cards pop
// up — scale + rotate into a lightly fanned grid — as the section scrolls into
// view, echoing the reference clip. Click any card to zoom in and read it.
const REVIEWS = [
  { img: "/images/reviews/r1.jpg", tag: "Skin" },
  { img: "/images/reviews/r2.jpg", tag: "Hair" },
  { img: "/images/reviews/r3.jpg", tag: "Hair" },
  { img: "/images/reviews/r4.jpg", tag: "Skin" },
  { img: "/images/reviews/r5.jpg", tag: "Under-eye" },
  { img: "/images/reviews/r6.jpg", tag: "Skin" },
  { img: "/images/reviews/r7.jpg", tag: "Skin" },
  { img: "/images/reviews/r8.jpg", tag: "Hair" },
];

const TILTS = [-6, 5, -4, 6, -5, 4, -3, 5];

const ReviewsSection = () => {
  const scope = useRef(null);
  const [zoom, setZoom] = useState(null);

  useGSAP(
    () => {
      // rest each card at its slight tilt, then pop it up from small + straight
      gsap.set(".review-card", { rotate: (i) => TILTS[i] ?? 0 });
      gsap.from(".review-card", {
        scale: 0.4,
        y: 90,
        rotate: 0,
        opacity: 0,
        transformOrigin: "center bottom",
        ease: "back.out(1.5)",
        duration: 0.7,
        stagger: { each: 0.09, from: "center" },
        scrollTrigger: {
          trigger: ".reviews-grid",
          start: "top 78%",
        },
      });
    },
    { scope }
  );

  return (
    <section
      ref={scope}
      className="relative bg-mint overflow-hidden md:py-28 py-16"
    >
      <div className="max-w-7xl mx-auto md:px-8 px-5">
        <p className="font-paragraph font-semibold uppercase tracking-[0.2em] text-teal text-xs md:text-sm text-center">
          Real stories · Real results
        </p>
        <h2 className="font-display md:text-6xl text-4xl font-bold text-teal-dark text-center leading-none mt-3">
          What our patients say
        </h2>
        <p className="font-paragraph text-ink/70 text-center md:text-lg text-base mt-4 max-w-2xl mx-auto">
          Unedited WhatsApp messages from people who trusted Devriz Healthcare.
          Tap any card to read the full chat.
        </p>

        <div className="reviews-grid grid grid-cols-2 md:grid-cols-4 md:gap-6 gap-4 md:mt-16 mt-10">
          {REVIEWS.map((r, i) => (
            <button
              key={r.img}
              type="button"
              onClick={() => setZoom(r.img)}
              className="review-card group relative block rounded-2xl overflow-hidden bg-white shadow-[0_20px_50px_rgba(70,57,15,0.18)] ring-1 ring-black/5 cursor-zoom-in"
            >
              <img
                src={r.img}
                alt="WhatsApp review from a Devriz Healthcare patient"
                loading="lazy"
                className="w-full aspect-[4/5] object-cover object-top"
              />
              <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 bg-teal-dark/85 text-cream text-[0.6rem] font-bold uppercase tracking-widest rounded-full px-2.5 py-1 backdrop-blur">
                {r.tag}
              </span>
              <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 bg-[#25D366] text-white text-[0.6rem] font-bold rounded-full px-2 py-1 shadow">
                ✓ WhatsApp
              </span>
            </button>
          ))}
        </div>
      </div>

      {zoom && (
        <div
          className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex-center p-4 cursor-zoom-out"
          onClick={() => setZoom(null)}
        >
          <img
            src={zoom}
            alt="WhatsApp review"
            className="max-h-[90vh] w-auto rounded-2xl shadow-2xl"
          />
          <button
            type="button"
            aria-label="Close"
            className="absolute top-5 right-5 text-white/90 text-4xl leading-none cursor-pointer"
          >
            ×
          </button>
        </div>
      )}
    </section>
  );
};

export default ReviewsSection;
