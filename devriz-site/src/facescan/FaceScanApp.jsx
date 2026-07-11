import { ContentProvider } from "../lib/ContentContext";
import { HeaderThemeProvider } from "../lib/HeaderTheme";
import { BookingProvider } from "../lib/BookingContext";
import ConsultModal from "../components/ConsultModal";
import NavBar from "../components/NavBar";
import FooterSection from "../sections/FooterSection";
import FaceScan from "./FaceScan";

// Standalone /ai-scan page. Reuses the exact same providers + ConsultModal as the
// main site so the report's "Book ₹49" button opens the existing Razorpay flow.
// Everything face-detection related is code-split into this route's chunk.
export default function FaceScanApp() {
  return (
    <ContentProvider>
      <HeaderThemeProvider>
        <BookingProvider>
          <NavBar />
          <FaceScan />
          <FooterSection />
          <ConsultModal />
        </BookingProvider>
      </HeaderThemeProvider>
    </ContentProvider>
  );
}
