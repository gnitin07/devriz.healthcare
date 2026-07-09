import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/all";
import { ContentProvider } from "./lib/ContentContext";
import { HeaderThemeProvider } from "./lib/HeaderTheme";
import NavBar from "./components/NavBar";
import StatsStrip from "./components/StatsStrip";
import HeroSection from "./sections/HeroSection";
import WhyConsultSection from "./sections/WhyConsultSection";
import ProcessSection from "./sections/ProcessSection";
import DoctorsSection from "./sections/DoctorsSection";
import TransformationsSection from "./sections/TransformationsSection";
import ConsultCTASection from "./sections/ConsultCTASection";
import FAQSection from "./sections/FAQSection";
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
        <main>
          <NavBar />
          <HeroSection />
          <StatsStrip />
          <WhyConsultSection />
          <ProcessSection />
          <DoctorsSection />
          <TransformationsSection />
          <ConsultCTASection />
          <FAQSection />
          <FooterSection />
        </main>
      </HeaderThemeProvider>
    </ContentProvider>
  );
};

export default App;
