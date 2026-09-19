import { useEffect, useState } from "react";
import { useContent } from "../lib/ContentContext";
import { useBooking } from "../lib/BookingContext";

// Two sticky pills — ₹49 consult (left) and free AI scan (right) — pinned
// just below the navbar and visible from the moment the page opens. They step
// aside while the "Two easy ways to start" cards (#get-started) are on screen,
// since those cards already offer the same two choices, and come back once the
// visitor scrolls past them in either direction. Phones only: on desktop the
// navbar already shows both buttons at all times.
const FloatingStartButtons = () => {
  const { settings } = useContent();
  const { openBooking } = useBooking();
  const [hidden, setHidden] = useState(false);
  const [navHeight, setNavHeight] = useState(60);

  useEffect(() => {
    const cards = document.querySelector("#get-started .start-grid");
    if (!cards) return;
    const io = new IntersectionObserver(([entry]) => setHidden(entry.isIntersecting));
    io.observe(cards);
    return () => io.disconnect();
  }, []);

  // follow the navbar's real height (it changes when scrolled or when the
  // mobile menu opens) so the pills always sit flush beneath it
  useEffect(() => {
    const nav = document.querySelector(".nav-bar");
    if (!nav) return;
    const ro = new ResizeObserver(() => setNavHeight(nav.offsetHeight));
    ro.observe(nav);
    return () => ro.disconnect();
  }, []);

  // py-3.5 + 14px text puts each pill at 52px tall — a comfortable thumb
  // target rather than the 44px minimum.
  //
  // Padding steps down twice on the way to narrow phones. At 360px — the most
  // common Android width there is — full px-5 pills come to exactly the 328px
  // available, and "exactly" is not a margin worth shipping when a device's
  // font rendering can differ by a pixel. px-4 there keeps the 14px text and
  // buys 24px of slack. Below 360px both padding and text step back.
  const base =
    "pointer-events-auto inline-flex items-center gap-1.5 max-[359px]:gap-1 rounded-full font-paragraph font-semibold text-[14px] max-[359px]:text-[12.5px] px-5 max-[374px]:px-4 max-[359px]:px-3 py-3.5 max-[359px]:py-3 cursor-pointer whitespace-nowrap shadow-[0_12px_30px_-8px_rgba(70,57,15,0.45)] transition-colors";

  return (
    <div
      className={`md:hidden fixed left-0 right-0 z-40 flex justify-between gap-2 px-4 max-[359px]:px-3 pt-2 pointer-events-none transition-[opacity,transform,top] duration-300 ease-out ${
        hidden ? "opacity-0 -translate-y-4" : "opacity-100 translate-y-0"
      }`}
      style={{ top: navHeight }}
      aria-hidden={hidden}
      inert={hidden}
    >
      <button
        type="button"
        onClick={openBooking}
        className={`${base} bg-teal-dark text-cream hover:bg-teal`}
      >
        🩺 Consult
        <span className="text-amber-light font-bold">@ ₹{settings.consultPrice}</span>
      </button>

      <a
        href="/ai-scan"
        className={`${base} bg-white text-teal-dark border-[1.5px] border-teal-dark/20 hover:bg-mint`}
      >
        ✨ Free AI Scan
      </a>
    </div>
  );
};

export default FloatingStartButtons;
