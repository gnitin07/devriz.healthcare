import { useEffect, useState } from "react";
import { useContent } from "../lib/ContentContext";
import { useHeaderTheme } from "../lib/HeaderTheme";

const LINKS = ["home", "about", "doctors", "concern"];
const TARGETS = {
  home: "#home",
  about: "#why",
  doctors: "#doctors",
  concern: "#process",
};

const NavBar = () => {
  const { settings } = useContent();
  const { dark } = useHeaderTheme();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // light treatment only while over a dark slide AND not scrolled
  // (once scrolled the navbar gets its cream background, so use dark ink)
  const light = dark && !scrolled;

  const go = (link) => {
    setOpen(false);
    document.querySelector(TARGETS[link])?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav
      className={`nav-bar ${scrolled ? "nav-scrolled" : ""} ${
        light ? "nav-light" : ""
      }`}
    >
      <div className="nav-inner">
        <img
          src="/images/logo.png"
          alt="Devriz Healthcare"
          className={`md:h-12 h-9 w-auto cursor-pointer transition-[filter] duration-300 ${
            light ? "brightness-0 invert" : ""
          }`}
          onClick={() => go("home")}
        />

        <div className="nav-links">
          {LINKS.map((link) => (
            <a key={link} onClick={() => go(link)} className="cursor-pointer">
              {link}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <a
            href={settings.bookingLink}
            target="_blank"
            rel="noreferrer"
            className="nav-cta"
          >
            Consult @ ₹{settings.consultPrice}
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
            <a key={link} onClick={() => go(link)} className="capitalize">
              {link}
            </a>
          ))}
        </div>
      )}
    </nav>
  );
};

export default NavBar;
