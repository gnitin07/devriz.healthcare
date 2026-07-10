import { useEffect, useState } from "react";
import { useContent } from "../lib/ContentContext";
import { useBooking } from "../lib/BookingContext";

// Slim sticky offer bar pinned to the bottom of the viewport.
// LANDING PAGE ONLY (rendered from LandingApp) — it does not appear on the
// main site. Slides up shortly after load and opens the booking modal, reusing
// the same flow as every other CTA so nothing else changes.
const LandingStickyCTA = () => {
  const { settings } = useContent();
  const { openBooking } = useBooking();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-[80] transition-transform duration-500 ease-out ${
        show ? "translate-y-0" : "translate-y-full"
      }`}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="bg-teal-dark/95 backdrop-blur border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.25)]">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 md:px-8 px-4 md:py-3 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="hidden sm:inline text-amber font-paragraph font-semibold text-sm">
              Limited offer
            </span>
            <span className="text-cream font-paragraph font-medium text-sm md:text-base truncate">
              Doctor consultation
            </span>
            <span className="text-cream/50 line-through font-paragraph text-sm">
              ₹{settings.originalPrice}
            </span>
            <span className="text-amber-light font-display font-bold text-lg md:text-xl leading-none">
              ₹{settings.consultPrice}
            </span>
          </div>

          <button
            type="button"
            onClick={openBooking}
            className="shrink-0 bg-amber hover:bg-amber-light text-teal-dark font-paragraph font-bold rounded-full md:px-7 px-5 md:py-3 py-2.5 text-sm md:text-base transition-colors cursor-pointer whitespace-nowrap"
          >
            Consult now
          </button>
        </div>
      </div>
    </div>
  );
};

export default LandingStickyCTA;
