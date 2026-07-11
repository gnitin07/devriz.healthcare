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
import AIScanSection from "./sections/AIScanSection";
import FAQSection from "./sections/FAQSection";
import ReviewsSection from "./sections/ReviewsSection";
import FooterSection from "./sections/FooterSection";

gsap.registerPlugin(ScrollTrigger);

const App = () => {
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
            <NavBar />
            <HeroSection />
            <StatsStrip />
            <WhyConsultSection />
            <ProcessSection />
            <DoctorsSection />
            <TransformationsSection />
            <ReviewsSection />
            <TeaserSection />
            <ConsultCTASection />
            <AIScanSection />
            <FAQSection />
            <FooterSection />
          </main>
          <ConsultModal />
        </BookingProvider>
      </HeaderThemeProvider>
    </ContentProvider>
  );
};

export default App;
