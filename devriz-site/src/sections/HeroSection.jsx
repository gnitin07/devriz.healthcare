import { useEffect, useRef, useState, useCallback } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useMediaQuery } from "react-responsive";
import { useContent } from "../lib/ContentContext";
import { useHeaderTheme } from "../lib/HeaderTheme";
import { useBooking } from "../lib/BookingContext";
import { urlFor } from "../lib/sanity";
import SlideVisual from "../components/SlideVisual";

const SLIDE_MS = 7000; // dwell per slide — calm, not fast
const FADE_S = 1.2; // crossfade duration

const isDarkSlide = (s) => s.dark ?? s.textTheme === "light";

// premium charcoal "studio" backgrounds (used until a photo is dropped in)
const CHARCOAL = {
  skin: "radial-gradient(120% 95% at 74% 34%, rgba(120,132,138,0.30), transparent 55%), linear-gradient(115deg,#15171a 0%,#22262b 60%,#2d3236 100%)",
  hair: "radial-gradient(120% 95% at 72% 38%, rgba(150,124,92,0.26), transparent 55%), linear-gradient(115deg,#17140f 0%,#28231b 60%,#332c22 100%)",
  body: "radial-gradient(120% 95% at 74% 36%, rgba(110,132,126,0.26), transparent 55%), linear-gradient(115deg,#12191a 0%,#1f2b2a 60%,#28322f 100%)",
  ai: "radial-gradient(120% 95% at 74% 36%, rgba(90,146,158,0.30), transparent 55%), linear-gradient(120deg,#0d1418 0%,#122129 55%,#173139 100%)",
};

const HeroSection = () => {
  const { heroBanners, settings } = useContent();
  const { setDark } = useHeaderTheme();
  const { openBooking } = useBooking();
  const isMobile = useMediaQuery({ query: "(max-width: 768px)" });

  // Full designed banners (text baked into the artwork) — rendered as
  // image-only slides. Separate desktop (landscape) + mobile (portrait) files.
  const demoSlides = [
    {
      _key: "skin",
      dark: true,
      gradient: CHARCOAL.skin,
      bgImage: "/images/hero-skin-desktop.jpg",
      bgImageMobile: "/images/hero-skin-mobile.jpg",
      alt: "Not every skin problem needs Google — get an expert skin diagnosis",
      link: settings.bookingLink,
    },
    {
      _key: "hair",
      dark: true,
      gradient: CHARCOAL.hair,
      bgImage: "/images/hero-hair-desktop.jpg",
      bgImageMobile: "/images/hero-hair-mobile.jpg",
      alt: "Hair fall isn't random — get a hair diagnosis",
      link: settings.bookingLink,
    },
    {
      _key: "body",
      dark: true,
      gradient: CHARCOAL.body,
      bgImage: "/images/hero-body-desktop.jpg",
      bgImageMobile: "/images/hero-body-mobile.jpg",
      alt: "Body care guided by real experts",
      link: settings.bookingLink,
    },
  ];

  const usingSanity = heroBanners.length > 0;
  const slides = usingSanity ? heroBanners : demoSlides;
  const count = slides.length;

  const [index, setIndex] = useState(0);
  const slideRefs = useRef([]);
  const mediaRefs = useRef([]);
  const progressRef = useRef(null);
  const paused = useRef(false);

  // photo for a slide: Sanity upload (desktop/mobile), or the local banner file
  const slidePhoto = (slide) => {
    const img =
      isMobile && slide.mobileImage ? slide.mobileImage : slide.desktopImage;
    if (img)
      return urlFor(img)
        .width(isMobile ? 1000 : 2200)
        .auto("format")
        .quality(82)
        .url();
    return (isMobile && slide.bgImageMobile) || slide.bgImage || null;
  };

  const animateTo = useCallback(
    (next) => {
      const n = (next + count) % count;

      slideRefs.current.forEach((el, i) => {
        if (!el) return;
        gsap.to(el, {
          opacity: i === n ? 1 : 0,
          duration: FADE_S,
          ease: "power2.inOut",
        });
        el.style.zIndex = i === n ? 2 : 1;
      });

      // no ken-burns zoom on the banners — any zoom would crop the baked text
      mediaRefs.current.forEach((el) => {
        if (!el) return;
        gsap.killTweensOf(el);
        gsap.set(el, { scale: 1 });
      });

      if (progressRef.current) {
        gsap.killTweensOf(progressRef.current);
        gsap.fromTo(
          progressRef.current,
          { scaleX: 0 },
          { scaleX: 1, duration: SLIDE_MS / 1000, ease: "none" }
        );
      }

      setIndex(n);
    },
    [count]
  );

  const go = useCallback((n) => animateTo(n), [animateTo]);

  useGSAP(
    () => {
      slideRefs.current.forEach((el, i) => {
        if (el) gsap.set(el, { opacity: i === 0 ? 1 : 0, zIndex: i === 0 ? 2 : 1 });
      });
      mediaRefs.current.forEach((el) => (el ? gsap.set(el, { scale: 1.03 }) : null));
      animateTo(0);
      gsap.from(".hero-overlay-active .hero-copy > *", {
        y: 40,
        opacity: 0,
        stagger: 0.12,
        duration: 0.9,
        ease: "power3.out",
        delay: 0.3,
      });
      gsap.from(".hero-overlay-active .hero-visual", {
        scale: 0.85,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        delay: 0.5,
      });
    },
    { dependencies: [usingSanity, count], revertOnUpdate: true }
  );

  useEffect(() => {
    setDark(isDarkSlide(slides[index] || {}));
    return () => setDark(false);
  }, [index, slides, setDark]);

  useEffect(() => {
    if (count < 2) return;
    const id = setInterval(() => {
      if (!paused.current) animateTo(index + 1);
    }, SLIDE_MS);
    return () => clearInterval(id);
  }, [index, count, animateTo]);

  const drag = useRef({ x: 0, active: false });
  const onDown = (e) => {
    drag.current = { x: e.clientX ?? e.touches?.[0]?.clientX ?? 0, active: true };
  };
  const onUp = (e) => {
    if (!drag.current.active) return;
    const x = e.clientX ?? e.changedTouches?.[0]?.clientX ?? 0;
    const dx = x - drag.current.x;
    drag.current.active = false;
    if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
  };

  const align = {
    left: "hero-al-left",
    center: "hero-al-center",
    right: "hero-al-right",
  };

  return (
    <section id="home" className="bg-mint">
      <div
        className="hero-container"
        onPointerDown={onDown}
        onPointerUp={onUp}
        onTouchStart={onDown}
        onTouchEnd={onUp}
      >
        {slides.map((slide, i) => {
          const photo = slidePhoto(slide);
          const theme = slide.textTheme || "dark";
          const pos = slide.textPosition || "left";
          const hasText = !!slide.heading;
          const isActive = i === index;
          const link = slide.link || settings.bookingLink;
          return (
            <div
              key={slide._id || slide._key || i}
              ref={(el) => (slideRefs.current[i] = el)}
              className="hero-slide"
            >
              {/* ken-burns wrapper: charcoal base + optional photo on top */}
              <div ref={(el) => (mediaRefs.current[i] = el)} className="slide-media">
                <div
                  className="slide-base"
                  style={{ background: slide.gradient || CHARCOAL.skin }}
                />
                {photo && (
                  <img
                    src={photo}
                    alt={slide.alt || slide.heading || "Devriz Healthcare"}
                    className="slide-photo"
                    loading={i === 0 ? "eager" : "lazy"}
                    draggable={false}
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                )}
              </div>

              {!hasText && (
                <button
                  type="button"
                  className="slide-link"
                  onClick={openBooking}
                  aria-label={slide.alt || "Book a consultation"}
                />
              )}

              {hasText && (
                <div
                  className={`slide-scrim ${
                    theme === "light" ? "scrim-dark" : "scrim-light"
                  } scrim-${pos}`}
                />
              )}

              {hasText && (
                <div
                  className={`hero-overlay ${align[pos]} theme-${theme} ${
                    isActive ? "hero-overlay-active" : ""
                  }`}
                >
                  <div className="hero-copy">
                    <h1>{slide.heading}</h1>
                    {slide.subheading && <p>{slide.subheading}</p>}
                    {slide.ctaLabel && (
                      <a href={link} target="_blank" rel="noreferrer" className="hero-cta">
                        {slide.ctaLabel} <span aria-hidden>→</span>
                      </a>
                    )}
                  </div>
                  <SlideVisual visual={slide.visual} />
                </div>
              )}
            </div>
          );
        })}

        <a href="/ai-scan" className="hero-aiscan" onPointerDown={(e) => e.stopPropagation()}>
          ✨ Try our Free AI Skin Scan — instant report
          <span aria-hidden>→</span>
        </a>

        {count > 1 && (
          <>
            <div className="hero-arrows">
              <button className="hero-arrow" onClick={() => go(index - 1)} aria-label="Previous slide">
                ‹
              </button>
              <button className="hero-arrow" onClick={() => go(index + 1)} aria-label="Next slide">
                ›
              </button>
            </div>

            <div className="hero-dots">
              {slides.map((_, i) => (
                <button
                  key={i}
                  className={i === index ? "active" : ""}
                  onClick={() => go(i)}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>

            <div className="hero-progress">
              <div ref={progressRef} className="bar" />
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default HeroSection;
