import { useRef, useState } from "react";
import gsap from "gsap";
import { useContent } from "../lib/ContentContext";
import { ScrollTrigger } from "gsap/all";

const FAQSection = () => {
  const { faqs } = useContent();
  const [openIndex, setOpenIndex] = useState(0);
  const answerRefs = useRef([]);

  const toggle = (i) => {
    const next = openIndex === i ? -1 : i;

    answerRefs.current.forEach((el, idx) => {
      if (!el) return;
      const isOpening = idx === next;
      gsap.to(el, {
        height: isOpening ? "auto" : 0,
        opacity: isOpening ? 1 : 0,
        duration: 0.45,
        ease: "power2.inOut",
        onComplete: () => ScrollTrigger.refresh(),
      });
    });
    setOpenIndex(next);
  };

  return (
    <section className="faq-section">
      <div className="mx-auto max-w-3xl md:px-8 px-5">
        <div className="text-center md:mb-16 mb-10">
          <p className="section-eyebrow text-teal">Good to know</p>
          <h2 className="general-title text-teal-dark leading-none mt-4">FAQs</h2>
        </div>

        {faqs.map((faq, i) => (
          <div key={faq._id || i} className="faq-item" onClick={() => toggle(i)}>
            <div className="faq-q">
              <h3>{faq.question}</h3>
              <span
                className="faq-icon"
                style={{ transform: openIndex === i ? "rotate(45deg)" : "none" }}
              >
                +
              </span>
            </div>
            <div
              ref={(el) => (answerRefs.current[i] = el)}
              className="faq-a"
              style={i === 0 ? { height: "auto", opacity: 1 } : undefined}
            >
              <p>{faq.answer}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default FAQSection;
