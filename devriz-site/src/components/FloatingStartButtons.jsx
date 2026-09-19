import { useEffect, useState } from "react";
import { useContent } from "../lib/ContentContext";
import { useBooking } from "../lib/BookingContext";

// Two sticky pills — ₹49 consult (left) and free AI scan (right) — pinned to
// the bottom of the screen, within thumb reach, and visible from the moment
// the page opens. They step aside while the "Two easy ways to start" cards
// (#get-started) are on screen, since those cards already offer the same two
// choices, and come back once the visitor scrolls past them in either
// direction. Phones only: from md up the navbar already shows both buttons at
// all times, so a floating bar there would only repeat it.
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
      className={`md:hidden fixed left-0 right-0 bottom-0 z-40 flex justify-between gap-2 px-4 max-[359px]:px-3 pt-3 pointer-events-none transition-[opacity,transform] duration-300 ease-out ${
        hidden ? "opacity-0 translate-y-6" : "opacity-100 translate-y-0"
      }`}
      // The gesture bar on a modern iPhone sits inside the viewport, so a flat
      // bottom padding would put the pills underneath it.
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
      aria-hidden={hidden}
      inert={hidden}
    >
      {/* Gold, not the dark brand brown it used to be. Now that the bar sits
          at the bottom of the screen it ends up over the footer, which is that
          same dark brown — the pill disappeared into it. Gold reads against
          both the footer and the cream sections above, and it is the treatment
          the navbar CTA already switches to over a dark slide (.nav-light).
          The deeper gold edge is what carries it on the light sections: gold
          on cream is only 2.1:1, so the fill alone would have the same
          problem in the other direction. #ad8726 clears 3:1 against both. */}
      <button
        type="button"
        onClick={openBooking}
        className={`${base} bg-amber text-teal-dark border-[1.5px] border-[#ad8726] hover:bg-amber-light`}
      >
        🩺 Consult
        <span className="font-bold">@ ₹{settings.consultPrice}</span>
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
