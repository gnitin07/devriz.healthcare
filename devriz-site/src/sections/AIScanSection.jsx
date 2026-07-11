import { useGSAP } from "@gsap/react";
import gsap from "gsap";

const STEPS = [
  { icon: "📷", title: "Scan your face", text: "30-second guided camera scan — runs privately in your browser." },
  { icon: "🧠", title: "AI reads your skin", text: "8 parameters: hydration, oil, tone, texture, redness & more." },
  { icon: "📄", title: "Get your report", text: "Download a personalised PDF report instantly — free." },
];

const AIScanSection = () => {
  useGSAP(() => {
    gsap.from(".aiscan-card", {
      y: 40,
      opacity: 0,
      duration: 0.8,
      ease: "power3.out",
      scrollTrigger: { trigger: ".aiscan-section", start: "top 80%" },
    });
    gsap.from(".aiscan-step", {
      y: 24,
      opacity: 0,
      stagger: 0.12,
      duration: 0.6,
      ease: "power2.out",
      scrollTrigger: { trigger: ".aiscan-steps", start: "top 85%" },
    });
  });

  return (
    <section id="ai-scan" className="aiscan-section bg-cream py-16 md:py-24 px-5">
      <div className="aiscan-card max-w-5xl mx-auto rounded-[28px] overflow-hidden bg-teal-dark text-cream card-shadow">
        <div className="md:p-14 p-8 text-center">
          <p className="section-eyebrow text-amber-light">New · 100% Free</p>
          <h2 className="general-title !text-4xl md:!text-6xl mt-3 mb-4">
            AI Skin Analysis
          </h2>
          <p className="max-w-xl mx-auto text-cream/80 text-[15px] md:text-lg mb-10">
            Not sure where to start? Let our AI scan your face and give you an instant,
            downloadable skin report — then get a personalised plan from our doctors for
            just ₹49.
          </p>

          <div className="aiscan-steps grid md:grid-cols-3 gap-6 md:gap-8 mb-10 text-left">
            {STEPS.map((s) => (
              <div
                key={s.title}
                className="aiscan-step bg-[#ffffff10] rounded-2xl p-6 border border-[#fffdf01a]"
              >
                <div className="text-3xl mb-3">{s.icon}</div>
                <h3 className="font-semibold text-lg mb-1.5 text-cream">{s.title}</h3>
                <p className="text-sm text-cream/70">{s.text}</p>
              </div>
            ))}
          </div>

          <a
            href="/ai-scan"
            className="inline-flex items-center gap-2 bg-amber text-teal-dark font-semibold rounded-full px-8 py-4 text-base hover:bg-amber-light transition-colors"
          >
            ✨ Start my free AI skin scan <span aria-hidden>→</span>
          </a>
          <p className="text-xs text-cream/50 mt-4">
            🔒 Private — your photo is analysed on your device and never uploaded.
          </p>
        </div>
      </div>
    </section>
  );
};

export default AIScanSection;
