import { useEffect } from "react";
import { ContentProvider } from "./lib/ContentContext";
import PaymentSection from "./sections/PaymentSection";

// Standalone /payment page. Deliberately WITHOUT the site NavBar, footer and
// booking modal: a checkout with nowhere to wander off to is the convention
// every payment page follows, and it keeps the QR the only thing on screen.
const PaymentApp = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
    // The title itself is set in PaymentSection, where the ₹ amount is known.

    // A payment page has no business in search results — it is reached from a
    // consultation, not from Google, and an indexed one invites impersonation.
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex, nofollow";
    document.head.appendChild(robots);
    return () => robots.remove();
  }, []);

  return (
    <ContentProvider>
      <PaymentSection />
    </ContentProvider>
  );
};

export default PaymentApp;
