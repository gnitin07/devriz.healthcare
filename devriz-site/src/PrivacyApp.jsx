import { useEffect } from "react";
import { ContentProvider } from "./lib/ContentContext";
import { HeaderThemeProvider } from "./lib/HeaderTheme";
import { BookingProvider } from "./lib/BookingContext";
import ConsultModal from "./components/ConsultModal";
import NavBar from "./components/NavBar";
import FooterSection from "./sections/FooterSection";
import PrivacyPolicySection from "./sections/PrivacyPolicySection";

// Standalone /privacy-policy page. Same shell (NavBar + Footer + providers +
// booking modal) as the home page, so navigation and the ₹49 CTA keep working.
const PrivacyApp = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Privacy Policy | Devriz Healthcare";
  }, []);

  return (
    <ContentProvider>
      <HeaderThemeProvider>
        <BookingProvider>
          <main>
            <NavBar />
            <PrivacyPolicySection />
            <FooterSection />
          </main>
          <ConsultModal />
        </BookingProvider>
      </HeaderThemeProvider>
    </ContentProvider>
  );
};

export default PrivacyApp;
