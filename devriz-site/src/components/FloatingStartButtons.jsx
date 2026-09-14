import { useEffect, useState } from "react";
import { useContent } from "../lib/ContentContext";
import { useBooking } from "../lib/BookingContext";

// Two floating pills — ₹49 consult (bottom-left) and free AI scan
// (bottom-right) — visible from the moment the page opens. They step aside
// while the "Two easy ways to start" cards (#get-started) are on screen, since
// those cards already offer the same two choices, and come back once the
// visitor scrolls past them in either direction. Phones only: on desktop the
// navbar already shows both buttons at all times.
const FloatingStartButtons = () => {
  const { settings } = useContent();
  const { openBooking } = useBooking();
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const cards = document.querySelector("#get-started .start-grid");
    if (!cards) return;
    const io = new IntersectionObserver(([entry]) => setHidden(entry.isIntersecting));
    io.observe(cards);
    return () => io.disconnect();
  }, []);

  const base =
    "pointer-events-auto inline-flex items-center gap-1.5 rounded-full font-paragraph font-semibold text-[13px] px-4 py-2.5 cursor-pointer whitespace-nowrap shadow-[0_12px_30px_-8px_rgba(70,57,15,0.45)] transition-colors";

  return (
    <div
      className={`md:hidden fixed left-0 right-0 bottom-0 z-[80] flex justify-between px-4 pointer-events-none transition-all duration-300 ease-out ${
        hidden ? "opacity-0 translate-y-6" : "opacity-100 translate-y-0"
      }`}
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
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
