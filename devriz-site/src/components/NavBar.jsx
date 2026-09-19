import { useEffect, useState } from "react";
import { useContent } from "../lib/ContentContext";
import { useHeaderTheme } from "../lib/HeaderTheme";
import { useBooking } from "../lib/BookingContext";

const LINKS = ["home", "about", "doctors", "concern", "blogs"];
const TARGETS = {
  home: "#home",
  about: "#why",
  doctors: "#doctors",
  concern: "#process",
  blogs: "/blogs",
};
// per-section document titles (SEO-friendly context as the visitor navigates)
const TITLES = {
  home: "Devriz Healthcare | Skin, Hair & Body Care Consultation @ ₹49",
  about: "Why Consultation Matters | Devriz Healthcare",
  doctors: "Meet Our Expert Doctors | Devriz Healthcare",
  concern: "How Devriz Works — 3 Step Process | Devriz Healthcare",
};

const LockIcon = () => (
  <svg viewBox="0 0 24 24" className="size-3.5 shrink-0" aria-hidden>
    <path
      fill="currentColor"
      d="M12 2a4.5 4.5 0 0 0-4.5 4.5V9H6.8A1.8 1.8 0 0 0 5 10.8v8.4A1.8 1.8 0 0 0 6.8 21h10.4a1.8 1.8 0 0 0 1.8-1.8v-8.4A1.8 1.8 0 0 0 17.2 9h-.7V6.5A4.5 4.5 0 0 0 12 2Zm0 2a2.5 2.5 0 0 1 2.5 2.5V9h-5V6.5A2.5 2.5 0 0 1 12 4Z"
    />
  </svg>
);

const NavBar = ({ landing = false }) => {
  const { settings } = useContent();
  const { dark } = useHeaderTheme();
  const { openBooking } = useBooking();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // light treatment only while over a dark slide AND not scrolled
  // (once scrolled the navbar gets its cream background, so use dark ink).
  // On the landing page the hero sits at the bottom, so its "dark" signal is
  // wrong for the top of the page — force dark ink there so the logo stays visible.
  const light = !landing && dark && !scrolled;

  const go = (link, e) => {
    e?.preventDefault();
    setOpen(false);
    // real pages (like /blogs) navigate; hash targets scroll
    if (TARGETS[link].startsWith("/")) {
      window.location.href = TARGETS[link];
      return;
    }
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
          src="/images/logo-r.webp"
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
          {/* desktop: pay (tertiary) + AI-scan (secondary) + Consult (primary) */}
          <a href="/payment" className="nav-secure hidden lg:inline-flex">
            <LockIcon />
            Secure Payment
          </a>
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

          {/* mobile: straight to the payment page. The consult and AI-scan
              choices this button used to open as a dropdown are the two
              floating pills sitting directly below this bar. */}
          <a
            href="/payment"
            className="nav-cta md:hidden !py-2 !px-4 inline-flex items-center gap-1.5"
          >
            <LockIcon />
            Secure Payment
          </a>

          <button
            className="md:hidden flex flex-col gap-1.5 p-2 cursor-pointer"
            onClick={() => setOpen((v) => !v)}
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
