import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useContent } from "../lib/ContentContext";
import { useBooking } from "../lib/BookingContext";

const ConsultCTASection = () => {
  const { settings } = useContent();
  const { openBooking } = useBooking();

  useGSAP(() => {
    // the main card scales into the center as you scroll to it
    gsap.from(".cta-card", {
      scale: 0.55,
      rotate: -7,
      opacity: 0,
      ease: "power1.inOut",
      scrollTrigger: {
        trigger: ".cta-section",
        start: "top 85%",
        end: "top 15%",
        scrub: 1,
      },
    });

  });

  return (
    <section className="cta-section">
      <div className="cta-card">
        <p className="cta-eyebrow">Limited time offer</p>
        <h3>
          Consult with our
          <br />
          doctors now
        </h3>
        <div className="cta-price-row">
          <span className="old-price">₹{settings.originalPrice}</span>
          <span className="new-price">₹{settings.consultPrice}</span>
        </div>
        <p>
          Personal consultation · skin-type diagnosis · personalised treatment
          plan · WhatsApp support
        </p>
        <button type="button" onClick={openBooking} className="cta-button">
          Book my consultation
        </button>
      </div>
    </section>
  );
};

export default ConsultCTASection;
