import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useContent } from "../lib/ContentContext";
import { useBooking } from "../lib/BookingContext";

// The two entry points — ₹49 doctor consult + free AI scan — as two compact
// cards side by side (2-col grid on mobile AND desktop).
const StartCardsSection = () => {
  const { settings } = useContent();
  const { openBooking } = useBooking();

  useGSAP(() => {
    gsap.from(".start-card", {
      y: 40,
      opacity: 0,
      stagger: 0.12,
      duration: 0.7,
      ease: "power3.out",
      scrollTrigger: { trigger: ".start-section", start: "top 82%" },
    });
  });

  return (
    <section id="get-started" className="start-section">
      <div className="start-inner">
        <div className="start-header">
          <p className="section-eyebrow text-teal">Ready when you are</p>
          <h2>Two easy ways to start</h2>
        </div>

        <div className="start-grid">
          {/* ₹49 doctor consultation */}
          <div className="start-card sc-consult">
            <span className="sc-badge">Most popular</span>
            <span className="sc-icon">🩺</span>
            <h3>Doctor Consult</h3>
            <div className="sc-price">
              <span className="old">₹{settings.originalPrice}</span>
              <span className="new">₹{settings.consultPrice}</span>
            </div>
            <p>Expert diagnosis &amp; a personalised plan on WhatsApp.</p>
            <button type="button" onClick={openBooking} className="sc-btn">
              Book now
            </button>
          </div>

          {/* free AI skin scan */}
          <div className="start-card sc-scan">
            <span className="sc-badge alt">100% Free</span>
            <span className="sc-icon">✨</span>
            <h3>AI Skin Scan</h3>
            <div className="sc-price">
              <span className="new">Free</span>
            </div>
            <p>30-sec face scan for an instant skin report. Private, on-device.</p>
            <a href="/ai-scan" className="sc-btn ghost">
              Scan free
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StartCardsSection;
