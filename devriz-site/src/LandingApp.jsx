import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/all";
import { ContentProvider } from "./lib/ContentContext";
import { HeaderThemeProvider } from "./lib/HeaderTheme";
import { BookingProvider } from "./lib/BookingContext";
import ConsultModal from "./components/ConsultModal";
import NavBar from "./components/NavBar";
import StatsStrip from "./components/StatsStrip";
import HeroSection from "./sections/HeroSection";
import WhyConsultSection from "./sections/WhyConsultSection";
import ProcessSection from "./sections/ProcessSection";
import DoctorsSection from "./sections/DoctorsSection";
import TransformationsSection from "./sections/TransformationsSection";
import TeaserSection from "./sections/TeaserSection";
import ConsultCTASection from "./sections/ConsultCTASection";
import FAQSection from "./sections/FAQSection";
import FooterSection from "./sections/FooterSection";

gsap.registerPlugin(ScrollTrigger);

// Ad landing page (Meta ads destination — /consult).
// A standalone page: NOT linked anywhere on the main site. Uses the exact same
// section components as the home page, reversed — so the ₹49 Consult box leads
// (the offer the Meta ad promises), the Hero banner sits near the end, and the
// FAQ is last. NavBar stays on top and Footer stays on the bottom.
const LandingApp = () => {
  useEffect(() => {
    const onLoad = () => ScrollTrigger.refresh();
    if (document.readyState === "complete") {
      onLoad();
    } else {
      window.addEventListener("load", onLoad);
      return () => window.removeEventListener("load", onLoad);
    }
  }, []);

  return (
    <ContentProvider>
      <HeaderThemeProvider>
        <BookingProvider>
          <main>
            <NavBar landing />
            <ConsultCTASection />
            <TeaserSection />
            <TransformationsSection />
            <DoctorsSection />
            <ProcessSection />
            <WhyConsultSection />
            <StatsStrip />
            <HeroSection />
            <FAQSection />
            <FooterSection />
          </main>
          <ConsultModal />
        </BookingProvider>
      </HeaderThemeProvider>
    </ContentProvider>
  );
};

export default LandingApp;
