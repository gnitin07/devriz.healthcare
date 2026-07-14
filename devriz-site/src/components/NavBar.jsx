import { useEffect, useRef, useState } from "react";
import { useContent } from "../lib/ContentContext";
import { useHeaderTheme } from "../lib/HeaderTheme";
import { useBooking } from "../lib/BookingContext";

const LINKS = ["home", "about", "doctors", "concern"];
const TARGETS = {
  home: "#home",
  about: "#why",
  doctors: "#doctors",
  concern: "#process",
};
// per-section document titles (SEO-friendly context as the visitor navigates)
const TITLES = {
  home: "Devriz Healthcare | Skin, Hair & Body Care Consultation @ ₹49",
  about: "Why Consultation Matters | Devriz Healthcare",
  doctors: "Meet Our Expert Doctors | Devriz Healthcare",
  concern: "How Devriz Works — 3 Step Process | Devriz Healthcare",
};

const NavBar = ({ landing = false }) => {
  const { settings } = useContent();
  const { dark } = useHeaderTheme();
  const { openBooking } = useBooking();
  const [open, setOpen] = useState(false);
  const [ctaOpen, setCtaOpen] = useState(false); // mobile "Get Started" dropdown
  const [scrolled, setScrolled] = useState(false);
  const ctaRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // close the CTA dropdown when tapping outside it
  useEffect(() => {
    if (!ctaOpen) return;
    const onDoc = (e) => {
      if (ctaRef.current && !ctaRef.current.contains(e.target)) setCtaOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
    };
  }, [ctaOpen]);

  // light treatment only while over a dark slide AND not scrolled
  // (once scrolled the navbar gets its cream background, so use dark ink).
  // On the landing page the hero sits at the bottom, so its "dark" signal is
  // wrong for the top of the page — force dark ink there so the logo stays visible.
  const light = !landing && dark && !scrolled;

  const go = (link, e) => {
    e?.preventDefault();
    setOpen(false);
    const el = document.querySelector(TARGETS[link]);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
      if (TITLES[link]) document.title = TITLES[link];
      // reflect the section in the URL (shareable deep link) without a reload
      window.history.replaceState(null, "", TARGETS[link]);
    } else {
      // on standalone pages (/ai-scan) the section isn't here — go home to it
      window.location.href = `/${TARGETS[link]}`;
    }
  };

  // On the landing page the logo links to the real home page I designed;
  // on the home page it just scrolls back to the top hero.
  const onLogo = () => {
    if (landing) {
      window.location.href = "/";
    } else {
      go("home");
    }
  };

  return (
    <nav
      className={`nav-bar ${scrolled ? "nav-scrolled" : ""} ${
        light ? "nav-light" : ""
      }`}
    >
      <div className="nav-inner">
        <img
          src="/images/logo-r.png"
          alt="Devriz Healthcare"
          className={`md:h-12 h-9 w-auto cursor-pointer transition-[filter] duration-300 ${
            light ? "brightness-0 invert" : ""
          }`}
          onClick={onLogo}
        />

        <div className="nav-links">
          {LINKS.map((link) => (
            <a
              key={link}
              href={TARGETS[link]}
              onClick={(e) => go(link, e)}
              className="cursor-pointer"
            >
              {link}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {/* desktop: AI-scan (secondary) + Consult (primary), grouped on the right */}
          <a href="/ai-scan" className="nav-aiscan hidden md:inline-flex">
            ✨ Free AI Scan
          </a>
          {!landing && (
            <button
              type="button"
              onClick={openBooking}
              className="nav-cta hidden md:inline-flex"
            >
              Consult @ ₹{settings.consultPrice}
            </button>
          )}

          {/* mobile: one "Get Started" button → dropdown with both choices */}
          <div className="md:hidden relative" ref={ctaRef}>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setCtaOpen((v) => !v);
              }}
              className="nav-cta !py-2 !px-4 inline-flex items-center gap-1"
              aria-haspopup="true"
              aria-expanded={ctaOpen}
            >
              Get Started
              <span aria-hidden className={`transition-transform ${ctaOpen ? "rotate-180" : ""}`}>
                ▾
              </span>
            </button>
            {ctaOpen && (
              <div className="nav-cta-menu">
                <button
                  type="button"
                  onClick={() => {
                    setCtaOpen(false);
                    openBooking();
                  }}
                >
                  💬 Consult @ ₹{settings.consultPrice}
                </button>
                <a href="/ai-scan">✨ Free AI Scan report</a>
              </div>
            )}
          </div>

          <button
            className="md:hidden flex flex-col gap-1.5 p-2 cursor-pointer"
            onClick={() => {
              setCtaOpen(false);
              setOpen((v) => !v);
            }}
            aria-label="Menu"
          >
            <span className={`block w-6 h-0.5 ${light ? "bg-cream" : "bg-teal-dark"}`} />
            <span className={`block w-6 h-0.5 ${light ? "bg-cream" : "bg-teal-dark"}`} />
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden backdrop-blur-xl bg-[#f7f4eeee] border-t border-[#0e3b3a14] px-6 py-4 flex flex-col gap-4 font-paragraph font-medium text-teal-dark">
          {LINKS.map((link) => (
            <a
              key={link}
              href={TARGETS[link]}
              onClick={(e) => go(link, e)}
              className="capitalize"
            >
              {link}
            </a>
          ))}
        </div>
      )}
    </nav>
  );
};

export default NavBar;
